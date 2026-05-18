export class CommunicationService {
  constructor(private baseUrl: string) {}

  async getPreferences(citizenId: string) {
    const res = await fetch(`${this.baseUrl}/api/comms/preferences/${citizenId}`);
    return res.json();
  }

  async getLetters(citizenId: string) {
    const res = await fetch(`${this.baseUrl}/api/comms/letters/${citizenId}`);
    return res.json();
  }

  async getSms(citizenId: string) {
    const res = await fetch(`${this.baseUrl}/api/comms/sms/${citizenId}`);
    return res.json();
  }

  async getEmails(citizenId: string) {
    const res = await fetch(`${this.baseUrl}/api/comms/emails/${citizenId}`);
    return res.json();
  }

  async sendCommunication(citizenId: string, type: string, message: string) {
    const res = await fetch(`${this.baseUrl}/api/comms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ citizenId, type, message })
    });
    return res.json();
  }
}