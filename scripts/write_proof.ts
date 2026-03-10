import { SessionClient } from '../src/services/acculynx/sessionClient.js';

async function executeWriteProof() {
    console.log('[Write-Back Proof] Initializing Session Client...');
    const client = new SessionClient();
    await client.initialize();

    const jobId = '35286d41-4c2f-46c3-bd0f-6b6d38de2aed'; // Test Job: 'AccuLynx Job' 25-769
    const testMessage = `TaskPro automated write-back proof generated at ${new Date().toISOString()}`;

    const payload = {
        RoleId: "1111111", // Standard role id captured from intercept
        MessageType: "General Comment",
        emailRecipients: [],
        attachments: [],
        index: -1,
        Message: testMessage,
        JobId: jobId,
        uploadedAttachments: []
    };

    console.log(`[Write-Back Proof] Attempting safely reversible POST to Add Note on Job: ${jobId}`);
    try {
        const result = await client.postJson(`/api/jobs/${jobId}/Messages`, payload);
        console.log('[Write-Back Proof] POST Successful!', result);

        // Verify the write by issuing a read
        console.log('\n[Write-Back Proof] Verifying mutation via READ...');
        const feed = await client.getJson(`/api/jobs/${jobId}/JobMessageFeed`);

        let found = false;
        const feedArray = feed.results || feed;
        if (Array.isArray(feedArray)) {
            const matchingMsgs = feedArray.filter((m: any) => m.Message && m.Message.includes('TaskPro automated write-back proof'));
            if (matchingMsgs.length > 0) {
                found = true;
                console.log(`[Write-Back Proof] ✅ Verified! Found the exact message in the AccuLynx timeline:`);
                console.log(`   -> "${matchingMsgs[0].Message}" (Posted By: ${matchingMsgs[0].CreatedByName})`);
            }
        }

        if (!found) {
            console.log('[Write-Back Proof] ❌ The POST returned success but the message did not immediately surface in the Feed array. Payload inspection might be needed.');
            console.log('Sample feed dump:', JSON.stringify(feed).substring(0, 300));
        }

    } catch (e: any) {
        console.error('[Write-Back Proof] ❌ Mutation Failed:', e.message);
    }
}

executeWriteProof().catch(console.error);
