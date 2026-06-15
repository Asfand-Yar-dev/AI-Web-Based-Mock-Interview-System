// Using native global fetch

async function run() {
  // 1. Login to get token
  const loginRes = await fetch('http://localhost:5000/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'debug_intv@example.com', password: 'Password123' })
  });
  
  if (!loginRes.ok) {
    console.error('Login failed:', await loginRes.text());
    return;
  }
  
  const loginData = await loginRes.json();
  const token = loginData.data.token;
  console.log('Login successful. Token retrieved.');

  // 2. Fetch profile using GET /api/interviewers/me
  const profileRes = await fetch('http://localhost:5000/api/interviewers/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  console.log('GET /api/interviewers/me Status:', profileRes.status);
  const profileData = await profileRes.json();
  console.log('GET /api/interviewers/me Response Body:', JSON.stringify(profileData, null, 2));
}

run().catch(console.error);
