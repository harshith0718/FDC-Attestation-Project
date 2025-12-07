const axios = require('axios');

class FDCService {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.FDC_API_KEY;
        this.baseUrl = 'https://api.factom.com/v1';
    }

    async createAttestation(data) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/attestations`,
                { data },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('FDC Attestation Error:', error.response?.data || error.message);
            throw new Error('Failed to create FDC attestation');
        }
    }

    async verifyAttestation(attestationId) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/attestations/${attestationId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('FDC Verification Error:', error.response?.data || error.message);
            throw new Error('Failed to verify FDC attestation');
        }
    }
}

module.exports = FDCService;
