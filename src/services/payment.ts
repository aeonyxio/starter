export class PaymentService {
  constructor(private baseUrl: string) {}

  async getHistory(citizenId: string) {
    const res = await fetch(`${this.baseUrl}/api/payments/history/${citizenId}`);
    return res.json();
  }

  async getUpcoming(citizenId: string) {
    const res = await fetch(`${this.baseUrl}/api/payments/upcoming/${citizenId}`);
    return res.json();
  }

  async getStatus(paymentId: string) {
    const res = await fetch(`${this.baseUrl}/api/payments/status/${paymentId}`);
    return res.json();
  }

  async getMethods(citizenId: string) {
    const res = await fetch(`${this.baseUrl}/api/payments/methods/${citizenId}`);
    return res.json();
  }

  async getDeductions(citizenId: string) {
    const res = await fetch(`${this.baseUrl}/api/payments/deductions/${citizenId}`);
    return res.json();
  }
}