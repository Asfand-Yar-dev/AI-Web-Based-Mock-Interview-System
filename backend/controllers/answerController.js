/**
 * =============================================================================
 * ANSWER CONTROLLER
 * =============================================================================
 * 
 * Handles answer submission with audio file uploads.
 * 
 * FIXES APPLIED:
 * 1. Fixed req.user._id -> req.user.id (JWT payload uses 'id')
 * 2. Replaced setTimeout mock with proper async AI service client
 * 3. Used fs.promises.unlink instead of callback-based fs.unlink
 * 4. Added proper error handling for file cleanup
 * 5. Added processing status tracking
 * 
 * PHASE 5 PREP:
 * - Replaced setTimeout with aiServiceClient for asynchronous AI processing
 * - Answer processing status tracked: pending -> processing -> completed/failed
 * - Fire-and-forget pattern with proper error logging
 * 
 * =============================================================================
 */

const Answer = require('../models/Answer');
const InterviewSession = require('../models/InterviewSession');
const { SESSION_STATUS } = require('../config/constants');
const logger = require('../config/logger');
const fs = require('fs').promises;

/**
 * @desc    Submit answer (audio + metadata)
 * @route   POST /api/interviews/:sessionId/answers
 * @access  Private
 */
exports.submitAnswer = async (req, res) => {
    // Validate files were uploaded
    const audioFile = req.files?.audio?.[0];
    const videoFile = req.files?.video?.[0];

    if (!audioFile) {
        return res.status(400).json({
            success: false,
            message: 'No audio file uploaded. Please attach an audio file.'
        });
    }

    const interviewId = req.params.sessionId;
    const { questionId, audioDuration } = req.body;

    // FIX: Use req.user.id (from JWT payload), not req.user._id
    const userId = req.user.id;
    const audioFilePath = audioFile.path;
    const videoFilePath = videoFile?.path;

    // Validate required fields
    if (!questionId) {
        // Clean up uploaded file if validation fails
        await safeDeleteFile(audioFilePath);
        if (videoFilePath) await safeDeleteFile(videoFilePath);
        return res.status(400).json({
            success: false,
            message: 'questionId is required in the request body.',
        });
    }

    // Verify the session exists and belongs to the user
    const session = await InterviewSession.findOne({
        _id: interviewId,
        user_id: userId,
    });

    if (!session) {
        await safeDeleteFile(audioFilePath);
        if (videoFilePath) await safeDeleteFile(videoFilePath);
        return res.status(404).json({
            success: false,
            message: 'Interview session not found or access denied.',
        });
    }

    if (session.status === 'completed' || session.status === 'cancelled') {
        await safeDeleteFile(audioFilePath);
        if (videoFilePath) await safeDeleteFile(videoFilePath);
        return res.status(400).json({
            success: false,
            message: 'Cannot submit answers to a closed session.',
        });
    }

    // Create the answer record
    const answer = await Answer.create({
        userId: userId,
        interviewId: interviewId,
        questionId: questionId,
        audioFileUrl: audioFilePath,
        audioFileName: audioFile.originalname,
        audioFileSize: audioFile.size,
        audioDuration: parseFloat(audioDuration) || 0,
        processingStatus: 'pending',
    });

    // Update session answered count
    session.answered_questions = (session.answered_questions || 0) + 1;
    await session.save();

    logger.info(
        `Answer submitted: ${answer._id} for interview ${interviewId}, audioFile=${audioFilePath}` +
        (videoFilePath ? `, videoFile=${videoFilePath}` : '')
    );

    // =========================================================================
    // PHASE 5 PREP: Async AI Processing (Fire-and-Forget)
    // =========================================================================
    // This runs in the background. The HTTP response is sent immediately.
    // When the Python AI microservice is ready, replace processWithAI() 
    // with an HTTP call to the FastAPI service.
    //
    // Architecture: Express → sends file to AI → AI returns results via webhook
    // OR: Express → puts job in queue (Bull/BullMQ) → worker processes it
    // =========================================================================
    processWithAI(answer._id, audioFilePath, videoFilePath).catch(err => {
        logger.error(`Background AI processing failed for answer ${answer._id}: ${err.message}`);
    });

    // Respond immediately — don't wait for AI
    res.status(201).json({
        success: true,
        message: 'Answer submitted successfully. AI processing started in background.',
        data: {
            _id: answer._id,
            interviewId: answer.interviewId,
            questionId: answer.questionId,
            audioFileName: answer.audioFileName,
            audioFileSize: answer.audioFileSize,
            audioDuration: answer.audioDuration,
            processingStatus: answer.processingStatus,
            createdAt: answer.createdAt,
        },
    });
};

/**
 * @desc    Get submitted answers for a session
 * @route   GET /api/interviews/:sessionId/answers
 * @access  Private
 */
exports.getAnswers = async (req, res) => {
    const interviewId = req.params.sessionId || req.params.id;
    const userId = req.user.id;

    const answers = await Answer.find({
        interviewId: interviewId,
        userId: userId,
    })
        .populate('questionId', 'questionText category difficulty')
        .sort({ createdAt: 1 });

    res.json({
        success: true,
        data: {
            interviewId,
            totalAnswers: answers.length,
            answers,
        }
    });
};

/**
 * @desc    Get processing status of an answer (for polling)
 * @route   GET /api/answers/:answerId/status
 * @access  Private
 */
exports.getAnswerStatus = async (req, res) => {
    const answer = await Answer.findOne({
        _id: req.params.answerId,
        userId: req.user.id,
    }).select('processingStatus transcription evaluationScore feedback processedAt');

    if (!answer) {
        return res.status(404).json({
            success: false,
            message: 'Answer not found.',
        });
    }

    res.json({
        success: true,
        data: {
            processingStatus: answer.processingStatus,
            transcription: answer.transcription,
            evaluationScore: answer.evaluationScore,
            feedback: answer.feedback,
            processedAt: answer.processedAt,
        },
    });
};

/**
 * =============================================================================
 * PHASE 5: AI PROCESSING FUNCTION
 * =============================================================================
 * 
 * Currently simulates AI processing. When your Python FastAPI microservice
 * is ready, replace the body of this function with an HTTP call.
 * 
 * OPTION A: Direct HTTP call to FastAPI
 *   const result = await aiServiceClient.analyze(filePath);
 * 
 * OPTION B: Queue-based (BullMQ) — recommended for production
 *   await aiJobQueue.add('analyze-answer', { answerId, filePath });
 * 
 * OPTION C: Webhook pattern
 *   await aiServiceClient.submitForAnalysis(answerId, filePath, callbackUrl);
 *   // AI service calls POST /api/webhooks/ai-result when done
 * =============================================================================
 */
/**
 * Map Python gateway /api/ai/analyze-answer response to orchestrator shape.
 */
function mapComprehensiveToAnalysis(comp) {
    const transcription = comp.transcription || '';
    const nlpScore = Math.round(Number(comp.nlp_score) || 0);
    const voiceScore = Math.round(Number(comp.voice_score) || 0);
    const voice = comp.voice_analysis || {};
    const cc = voice.clarity_confidence || {};
    const tone = voice.tone || {};
    const hs = voice.hesitation_stress || {};

    return {
        nlp: {
            score: nlpScore,
            metrics: {
                relevance: nlpScore,
                coherence: nlpScore,
                wordCount: transcription.split(/\s+/).filter(Boolean).length,
                transcription,
            },
            feedback: {
                summary: comp.nlp_feedback || '',
                strengths: nlpScore >= 70 ? ['Solid alignment with the topic'] : ['You addressed the question'],
                improvements:
                    nlpScore < 70
                        ? ['Add examples and deeper detail where relevant']
                        : ['Polish clarity and structure'],
            },
        },
        vocal: {
            score: voiceScore,
            metrics: {
                confidence: Math.round(Number(cc.confidence_score) || voiceScore),
                clarity: Math.round(Number(cc.clarity_score) || voiceScore),
                tone: Math.round(Number(tone.tone_score) || voiceScore),
                pace: Math.round(100 - Number(hs.hesitation_score || 0)),
                stress: Math.round(Number(hs.stress_score) || 0),
            },
            feedback: {
                summary: 'Vocal delivery analyzed.',
                strengths: [],
                improvements: [],
            },
        },
        facial: null,
        overallScore: Math.round(Number(comp.overall_score) || 0),
        timestamp: new Date().toISOString(),
        _geminiFeedback: comp.gemini_feedback || '',
    };
}

function hasMeaningfulSpeech(text) {
    const cleaned = String(text || '').trim();
    if (!cleaned) return false;
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    if (tokens.length < 3) return false;
    // Filter obvious punctuation/noise-only transcripts.
    const alphaChars = cleaned.replace(/[^a-zA-Z]/g, '').length;
    return alphaChars >= 6;
}

async function tryCompileIfSessionReady(interviewId, userId) {
    try {
        const session = await InterviewSession.findById(interviewId);
        if (!session || session.status !== SESSION_STATUS.COMPLETED) return;

        const answers = await Answer.find({ interviewId });
        if (!answers.length) return;

        const stillRunning = answers.some(
            a => a.processingStatus === 'pending' || a.processingStatus === 'processing'
        );
        if (stillRunning) return;

        const { compileInterviewResult } = require('../routes/resultRoutes');
        await compileInterviewResult(interviewId, userId);
    } catch (e) {
        logger.warn(`tryCompileIfSessionReady: ${e.message}`);
    }
}

async function processWithAI(answerId, audioFilePath, videoFilePath) {
    try {
        await Answer.findByIdAndUpdate(answerId, { processingStatus: 'processing' });

        const aiServices = require('../services');
        const aiServiceClient = require('../services/aiServiceClient');
        const Question = require('../models/Question');

        const answer = await Answer.findById(answerId);
        if (!answer) throw new Error('Answer not found');

        const question = await Question.findById(answer.questionId);
        const questionText = question?.questionText || '';
        // Use a proper expected answer if available; otherwise send empty string so the
        // AI evaluator scores based on answer quality alone rather than comparing the
        // user's spoken answer against the question text (which always gives low scores).
        const reference = question?.expectedAnswer || '';

        const audioBuffer = await fs.readFile(audioFilePath);
        const videoBuffer = videoFilePath ? await fs.readFile(videoFilePath) : null;
        let analysis = null;

        try {
            const comp = await aiServiceClient.analyzeAnswerComprehensive(
                audioBuffer,
                questionText,
                reference,
                answer.audioFileName || 'recording.webm'
            );
            if (comp && comp.status === 'success') {
                // If STT produced nothing, treat this as a failed comprehensive run
                // so we fall back to the slower pipeline that includes Whisper again.
                if (!hasMeaningfulSpeech(comp.transcription || '')) {
                    logger.warn(`Comprehensive AI returned empty transcription for answer ${answerId}`);
                } else {
                    analysis = mapComprehensiveToAnalysis(comp);
                }
            }
        } catch (err) {
            logger.warn(`Comprehensive AI pipeline failed: ${err.message}`);
        }

        if (!analysis) {
            let text = answer.answerText || '';
            if (!text.trim()) {
                try {
                    const tr = await aiServiceClient.transcribeAudio(
                        audioBuffer,
                        answer.audioFileName || 'recording.webm'
                    );
                    if (tr && tr.status === 'success' && tr.text) text = tr.text;
                } catch (err) {
                    logger.warn(`STT fallback failed: ${err.message}`);
                }
            }

            // Reject silent/empty answers: do not fabricate NLP/voice scores.
            if (!hasMeaningfulSpeech(text)) {
                await Answer.findByIdAndUpdate(answerId, {
                    transcription: '',
                    evaluationScore: 0,
                    feedback: 'No speech detected in your recording. Please answer by speaking clearly and try again.',
                    processingStatus: 'completed',
                    processedAt: new Date(),
                });
                await tryCompileIfSessionReady(answer.interviewId, answer.userId);
                await safeDeleteFile(audioFilePath);
                if (videoFilePath) await safeDeleteFile(videoFilePath);
                return;
            }

            analysis = await aiServices.analyzeAnswer({
                text,
                reference,
                question: questionText,
                audioUrl: audioFilePath,
                filename: answer.audioFileName,
                videoUrl: videoFilePath,
                videoBuffer: videoBuffer || undefined,
            });

            if (text) {
                analysis.nlp = analysis.nlp || { metrics: {}, feedback: {} };
                analysis.nlp.metrics = { ...(analysis.nlp.metrics || {}), transcription: text };
            }
        }

        // Face analysis (separate, because the comprehensive endpoint is STT+NLP+Voice)
        if (videoBuffer && !analysis.facial) {
            try {
                const faceRes = await aiServices.facialService.analyzeFacial({
                    videoBuffer,
                    filename: 'video.webm',
                });
                analysis.facial = faceRes;
            } catch (err) {
                logger.warn(`Facial analysis failed for answer ${answerId}: ${err.message}`);
                analysis.facial = analysis.facial || null;
            }
        }

        const transcription =
            analysis.nlp?.metrics?.transcription ||
            analysis.vocal?.transcription ||
            answer.answerText ||
            '';

        let feedbackText = _generateFeedback(analysis);
        if (analysis._geminiFeedback) {
            feedbackText = [analysis._geminiFeedback, feedbackText].filter(Boolean).join('\n\n');
        }

        await Answer.findByIdAndUpdate(answerId, {
            transcription,
            evaluationScore: analysis.overallScore,
            feedback: feedbackText,
            processingStatus: 'completed',
            processedAt: new Date(),
        });

        await aiServices.saveAnalysis(answerId, answer.interviewId, answer.userId, analysis);

        logger.info(`AI processing completed for answer ${answerId}, score: ${analysis.overallScore}`);

        await tryCompileIfSessionReady(answer.interviewId, answer.userId);
        await safeDeleteFile(audioFilePath);
        if (videoFilePath) await safeDeleteFile(videoFilePath);
    } catch (error) {
        logger.error(`AI processing error for answer ${answerId}: ${error.message}`);

        await Answer.findByIdAndUpdate(answerId, {
            processingStatus: 'failed',
        }).catch(err => logger.error(`Failed to update answer status: ${err.message}`));

        // Best-effort cleanup even when AI processing fails.
        await safeDeleteFile(audioFilePath);
        if (videoFilePath) await safeDeleteFile(videoFilePath);
    }
}

/**
 * Generate feedback text from analysis
 */
function _generateFeedback(analysis) {
    const parts = [];
    if (analysis.nlp?.feedback?.summary) parts.push(analysis.nlp.feedback.summary);
    if (analysis.vocal?.feedback?.summary) parts.push(analysis.vocal.feedback.summary);
    if (analysis.facial?.feedback?.summary) parts.push(analysis.facial.feedback.summary);
    
    return parts.length > 0 ? parts.join(' ') : 'Answer analyzed successfully.';
}

/**
 * Safely delete a file (non-blocking, with error handling)
 */
async function safeDeleteFile(filePath) {
    try {
        if (!filePath) return;
        await fs.unlink(filePath);
        logger.info(`Deleted temp file: ${filePath}`);
    } catch (err) {
        if (err.code !== 'ENOENT') { // Don't log if file doesn't exist
            logger.error(`Failed to delete file ${filePath}: ${err.message}`);
        }
    }
}

/**
 * =============================================================================
 * WEBHOOK ENDPOINT: Receive AI Results (Phase 5)
 * =============================================================================
 * 
 * When using the webhook pattern, the Python AI service calls this endpoint
 * to deliver analysis results.
 * 
 * @route   POST /api/webhooks/ai-result
 * @access  Server-to-Server (secured by API key)
 */
exports.receiveAIResult = async (req, res) => {
    // Verify the webhook secret (server-to-server auth)
    const webhookSecret = req.headers['x-webhook-secret'];
    if (webhookSecret !== process.env.AI_WEBHOOK_SECRET) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { answerId, transcription, evaluationScore, feedback, analysis } = req.body;

    if (!answerId) {
        return res.status(400).json({ success: false, message: 'answerId is required' });
    }

    try {
        const answer = await Answer.findById(answerId);
        if (!answer) {
            return res.status(404).json({ success: false, message: 'Answer not found' });
        }

        // Update with AI results
        answer.transcription = transcription || answer.transcription;
        answer.evaluationScore = evaluationScore;
        answer.feedback = feedback;
        answer.processingStatus = 'completed';
        answer.processedAt = new Date();
        await answer.save();

        // Clean up audio file after successful processing
        if (answer.audioFileUrl && answer.audioFileUrl !== 'deleted_post_analysis') {
            await safeDeleteFile(answer.audioFileUrl);
            answer.audioFileUrl = 'processed';
            await answer.save();
        }

        logger.info(`AI webhook result received for answer ${answerId}`);

        res.json({ success: true, message: 'Result processed' });
    } catch (error) {
        logger.error(`Webhook processing error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Processing failed' });
    }
};