export interface Citizen {
  id: string;
  name: string;
  nino: string;
  status: string;
}

export class CitizenService {
  constructor(private baseUrl: string) {}

  async searchCitizens(query: string): Promise<Citizen[]> {
    const res = await fetch(`${this.baseUrl}/api/citizen/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`Citizen API error: ${res.statusText}`);
    return res.json();
  }

  async getCitizen(id: string) {
    const res = await fetch(`${this.baseUrl}/api/citizen/${id}`);
    return res.json();
  }

  async getAddress(id: string) {
    const res = await fetch(`${this.baseUrl}/api/citizen/${id}/address`);
    return res.json();
  }

  async getEmployment(id: string) {
    const res = await fetch(`${this.baseUrl}/api/citizen/${id}/employment`);
    return res.json();
  }

  async validateNino(nino: string) {
    const res = await fetch(`${this.baseUrl}/api/citizen/validate-nino`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nino })
    });
    return res.json();
  }
}