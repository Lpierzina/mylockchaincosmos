const express = require('express');
const router = express.Router();
const { execSync } = require('child_process');

router.post('/cosmosSubmitDocument', async (req, res) => {
  try {
    const { documentHash } = req.body;

    if (!documentHash || !/^0x[a-fA-F0-9]{64}$/.test(documentHash)) {
      return res.status(400).json({ error: 'Invalid documentHash format (expected 0x-prefixed Keccak256)' });
    }

    // Convert hex to base64
    const base64Hash = Buffer.from(documentHash.replace(/^0x/, ''), 'hex').toString('base64');

    // Construct JSON execute message
    const execMsg = JSON.stringify({
      register: {
        document_hash: base64Hash
      }
    });

    // Load from environment or config
    const CONTRACT_ADDR = process.env.COSMOS_CONTRACT_ADDRESS;
    const FROM_ACCOUNT = process.env.COSMOS_SIGNER || 'mylockchain2';

    if (!CONTRACT_ADDR) {
      throw new Error("Missing COSMOS_CONTRACT_ADDRESS env variable");
    }

    // Execute the contract call using neutrond
    console.log('📤 Executing register() on Cosmos contract with base64:', base64Hash);

    const cmd = `neutrond tx wasm execute ${CONTRACT_ADDR} '${execMsg}' \
      --from ${FROM_ACCOUNT} \
      --gas auto --gas-adjustment 1.4 \
      --fees 8000untrn \
      --broadcast-mode sync \
      --yes \
      --output json`;

    const stdout = execSync(cmd, { encoding: 'utf8' });
    const parsed = JSON.parse(stdout);

    const txHash = parsed.txhash || parsed.transactionHash;

    if (!txHash) {
      return res.status(500).json({ error: 'Transaction submitted but no hash returned.' });
    }

    console.log(`✅ Submitted: ${txHash}`);
    return res.json({ hash: txHash });

  } catch (err) {
    console.error('❌ Cosmos submission error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
