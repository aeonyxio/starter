export interface Person {
  id: string;
  name: string;
  nino: string;
  status: string;
}

export class ApiService {
  constructor(private baseUrl: string) {}

  async findPerson(query: string): Promise<Person[]> {
    const response = await fetch(`${this.baseUrl}/api/people?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.statusText}`);
    }
    return response.json();
  }
}