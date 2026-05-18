export class HealthService {
  constructor(private baseUrl: string) {}

  async getAssessments(citizenId: string) {
    const res = await fetch(`${this.baseUrl}/api/health/assessments/${citizenId}`);
    return res.json();
  }

  async getConditions(citizenId: string) {
    const res = await fetch(`${this.baseUrl}/api/health/conditions/${citizenId}`);
    return res.json();
  }

  async getAppointments(citizenId: string) {
    const res = await fetch(`${this.baseUrl}/api/health/appointments/${citizenId}`);
    return res.json();
  }

  async getCertificates(citizenId: string) {
    const res = await fetch(`${this.baseUrl}/api/health/certificates/${citizenId}`);
    return res.json();
  }

  async getHistory(citizenId: string) {
    const res = await fetch(`${this.baseUrl}/api/health/history/${citizenId}`);
    return res.json();
  }
}