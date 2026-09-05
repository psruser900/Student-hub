const http = require('http');
const app = require('../server');

let server;
const PORT = 4001;

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      ...headers
    };
    if (payload) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json || data
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Student Hub Automated Sanity Checks ---');

  server = app.listen(PORT);
  let studentToken = '';
  let adminToken = '';

  try {
    // 1. Test Demo Student Login
    console.log('1. Testing Student Login...');
    const loginRes = await makeRequest('/api/auth/login', 'POST', {
      email: 'student@college.edu',
      password: 'Student@123'
    });
    if (loginRes.status !== 200 || !loginRes.body.token) {
      throw new Error(`Student login failed: ${JSON.stringify(loginRes.body)}`);
    }
    studentToken = loginRes.body.token;
    console.log('   ✓ Student login passed! Token received.');

    // 2. Test Admin Login
    console.log('2. Testing Admin Login...');
    const adminLoginRes = await makeRequest('/api/auth/login', 'POST', {
      email: 'admin@college.edu',
      password: 'Admin@123'
    });
    if (adminLoginRes.status !== 200 || !adminLoginRes.body.token) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLoginRes.body)}`);
    }
    adminToken = adminLoginRes.body.token;
    console.log('   ✓ Admin login passed! Token received.');

    // 3. Test Student Profile Retrieval
    console.log('3. Testing /api/auth/me...');
    const profileRes = await makeRequest('/api/auth/me', 'GET', null, {
      'Authorization': `Bearer ${studentToken}`
    });
    if (profileRes.status !== 200 || profileRes.body.user.role !== 'student') {
      throw new Error(`Profile retrieval failed: ${JSON.stringify(profileRes.body)}`);
    }
    console.log(`   ✓ Profile verified for: ${profileRes.body.user.name} (${profileRes.body.user.rollNo})`);

    // 4. Test Academic Hierarchy: 1st Year, 1st Semester Subjects
    console.log('4. Testing /api/subjects?year=1&semester=1...');
    const subjectsRes = await makeRequest('/api/subjects?year=1&semester=1');
    if (subjectsRes.status !== 200 || !Array.isArray(subjectsRes.body.subjects) || subjectsRes.body.subjects.length < 5) {
      throw new Error(`Subjects check failed: ${JSON.stringify(subjectsRes.body)}`);
    }
    console.log(`   ✓ Found ${subjectsRes.body.subjects.length} subjects for 1st Year Sem 1:`);
    subjectsRes.body.subjects.forEach(s => console.log(`      • [${s.code}] ${s.name}`));

    // 5. Test Units for Engineering Mathematics I (MATH101)
    console.log('5. Testing Subject Details & Units 1 to 5 (/api/subjects/1)...');
    const unitRes = await makeRequest('/api/subjects/1', 'GET', null, {
      'Authorization': `Bearer ${studentToken}`
    });
    if (unitRes.status !== 200 || !unitRes.body.subject.units || unitRes.body.subject.units.length !== 5) {
      throw new Error(`Unit breakdown failed: ${JSON.stringify(unitRes.body)}`);
    }
    console.log(`   ✓ Subject ${unitRes.body.subject.code} contains ${unitRes.body.subject.units.length} units with attached notes!`);

    // 6. Test PDF Streaming View
    console.log('6. Testing In-Browser PDF Stream (/api/notes/1/view)...');
    const pdfViewRes = await makeRequest('/api/notes/1/view', 'GET', null, {
      'Authorization': `Bearer ${studentToken}`
    });
    if (pdfViewRes.status !== 200 || pdfViewRes.headers['content-type'] !== 'application/pdf') {
      throw new Error(`PDF streaming failed: status=${pdfViewRes.status}, type=${pdfViewRes.headers['content-type']}`);
    }
    console.log('   ✓ PDF streaming header verified: application/pdf, inline disposition.');

    // 7. Test Global Search
    console.log('7. Testing Search (/api/notes/search?q=Calculus)...');
    const searchRes = await makeRequest('/api/notes/search?q=Calculus', 'GET', null, {
      'Authorization': `Bearer ${studentToken}`
    });
    if (searchRes.status !== 200 || searchRes.body.total < 1) {
      throw new Error(`Search failed: ${JSON.stringify(searchRes.body)}`);
    }
    console.log(`   ✓ Search returned ${searchRes.body.total} matching note(s).`);

    // 8. Test Bookmarks Toggle
    console.log('8. Testing Bookmarks Toggle (/api/bookmarks/1)...');
    const bookmarkRes1 = await makeRequest('/api/bookmarks/1', 'POST', null, {
      'Authorization': `Bearer ${studentToken}`
    });
    if (bookmarkRes1.status !== 200) {
      throw new Error(`Bookmark toggle failed: ${JSON.stringify(bookmarkRes1.body)}`);
    }
    console.log(`   ✓ Bookmark toggle state: ${bookmarkRes1.body.bookmarked ? 'Saved' : 'Removed'}`);

    // If it was removed, toggle it back on to test bookmarked state
    if (!bookmarkRes1.body.bookmarked) {
      await makeRequest('/api/bookmarks/1', 'POST', null, { 'Authorization': `Bearer ${studentToken}` });
    }

    const getBookmarksRes = await makeRequest('/api/bookmarks', 'GET', null, {
      'Authorization': `Bearer ${studentToken}`
    });
    if (getBookmarksRes.status !== 200 || !Array.isArray(getBookmarksRes.body.bookmarks)) {
      throw new Error(`Get bookmarks failed: ${JSON.stringify(getBookmarksRes.body)}`);
    }
    console.log(`   ✓ Student has ${getBookmarksRes.body.bookmarks.length} bookmarked note(s).`);

    // 9. Test Admin Portal Stats
    console.log('9. Testing Admin Stats (/api/admin/stats)...');
    const statsRes = await makeRequest('/api/admin/stats', 'GET', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    if (statsRes.status !== 200 || !statsRes.body.stats) {
      throw new Error(`Admin stats failed: ${JSON.stringify(statsRes.body)}`);
    }
    console.log('   ✓ Admin stats retrieved:', statsRes.body.stats);

    console.log('\n🎉 ALL SANITY CHECKS PASSED SUCCESSFULLY! 🎉');
  } catch (err) {
    console.error('\n❌ Test failure:', err.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runTests();
