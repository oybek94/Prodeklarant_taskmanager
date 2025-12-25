/**
 * Test script to check if archive API returns tasks correctly
 */

async function testArchiveAPI() {
  const baseUrl = 'http://localhost:3001';
  
  // First, login to get token
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'admin@local.test',
      password: 'admin123',
    }),
  });
  
  if (!loginResponse.ok) {
    console.error('Login failed:', await loginResponse.text());
    return;
  }
  
  const { accessToken } = await loginResponse.json();
  console.log('Login successful\n');
  
  // Test archive endpoint
  console.log('Testing archive endpoint: GET /api/tasks?status=YAKUNLANDI');
  const archiveResponse = await fetch(`${baseUrl}/api/tasks?status=YAKUNLANDI`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (!archiveResponse.ok) {
    console.error('Archive request failed:', await archiveResponse.text());
    return;
  }
  
  const archiveTasks = await archiveResponse.json();
  console.log(`Archive tasks count: ${archiveTasks.length}`);
  
  if (archiveTasks.length > 0) {
    console.log('\nFirst 3 tasks:');
    archiveTasks.slice(0, 3).forEach((task: any) => {
      console.log(`  - Task ${task.id}: ${task.title.substring(0, 40)}... (Status: ${task.status})`);
    });
  } else {
    console.log('\nNo tasks found in archive!');
  }
  
  // Test regular endpoint (should exclude YAKUNLANDI)
  console.log('\n\nTesting regular endpoint: GET /api/tasks');
  const regularResponse = await fetch(`${baseUrl}/api/tasks`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (!regularResponse.ok) {
    console.error('Regular request failed:', await regularResponse.text());
    return;
  }
  
  const regularTasks = await regularResponse.json();
  console.log(`Regular tasks count: ${regularTasks.length}`);
  
  const yakunlandiInRegular = regularTasks.filter((t: any) => t.status === 'YAKUNLANDI').length;
  console.log(`YAKUNLANDI tasks in regular endpoint: ${yakunlandiInRegular}`);
}

testArchiveAPI().catch(console.error);

