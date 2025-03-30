const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, get, push, update, remove } = require('firebase/database');

// Firebase 설정
const firebaseConfig = {
    databaseURL: 'https://askbot-65036-default-rtdb.asia-southeast1.firebasedatabase.app'
};

let database;

try {
    // Firebase 초기화
    const app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    console.log('Firebase 초기화 성공');
} catch (error) {
    console.error('Firebase 초기화 실패:', error);
    process.exit(1);  // 치명적인 오류이므로 프로세스 종료
}

// 연결 테스트
async function testConnection() {
    try {
        const testRef = ref(database, 'test');
        await set(testRef, {
            timestamp: Date.now(),
            status: 'connected'
        });
        const snapshot = await get(testRef);
        console.log('Firebase 연결 성공:', snapshot.val());
        return true;
    } catch (error) {
        console.error('Firebase 연결 실패:', error);
        return false;
    }
}

// CRUD 테스트
async function testCRUD() {
    try {
        // 1. Create - 이벤트 생성 테스트
        const eventsRef = ref(database, 'events');
        const newEventRef = push(eventsRef);
        const eventData = {
            title: '테스트 이벤트',
            description: '테스트 설명',
            startTime: new Date().toISOString(),
            channel: 'test-channel',
            creator: 'test-user',
            attendees: [{
                userId: 'test-user',
                status: 'yes'
            }]
        };
        await set(newEventRef, eventData);
        console.log('이벤트 생성 성공:', newEventRef.key);

        // 2. Read - 이벤트 읽기 테스트
        const eventSnapshot = await get(newEventRef);
        console.log('이벤트 읽기 성공:', eventSnapshot.val());

        // 3. Update - 이벤트 수정 테스트
        await update(newEventRef, {
            title: '수정된 테스트 이벤트',
            updatedAt: new Date().toISOString()
        });
        const updatedSnapshot = await get(newEventRef);
        console.log('이벤트 수정 성공:', updatedSnapshot.val());

        // 4. Delete - 이벤트 삭제 테스트
        await remove(newEventRef);
        const deletedSnapshot = await get(newEventRef);
        console.log('이벤트 삭제 성공:', deletedSnapshot.val() === null);

        return true;
    } catch (error) {
        console.error('CRUD 테스트 실패:', error);
        return false;
    }
}

// 테스트 실행
async function runTests() {
    console.log('=== Firebase 테스트 시작 ===');
    
    // 연결 테스트
    console.log('\n1. 연결 테스트');
    await testConnection();
    
    // CRUD 테스트
    console.log('\n2. CRUD 테스트');
    await testCRUD();
    
    console.log('\n=== Firebase 테스트 완료 ===');
}

// 테스트 실행
if (require.main === module) {
    runTests();
}

module.exports = {
    database,
    testConnection,
    testCRUD
}; 