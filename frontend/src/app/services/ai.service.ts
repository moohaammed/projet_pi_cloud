import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  async sendCommand(command: string): Promise<any | null> {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3',
          stream: false,
          prompt: `
You are an assistant for an Alzheimer patient web app.
Your job is to convert the user's sentence into one JSON action only.

Allowed actions:
1. {"action":"navigate","target":"/home"}
2. {"action":"navigate","target":"/rendezvous"}
3. {"action":"navigate","target":"/patient-dashboard"}
4. {"action":"navigate","target":"/education"}
5. {"action":"navigate","target":"/collaboration/messenger"}
6. {"action":"navigate","target":"/events"}
7. {"action":"navigate","target":"/collaboration/feed"}
8. {"action":"navigate","target":"/donations"}
9. {"action":"speak","message":"short helpful message"}

Rules:
- Respond with JSON only
- Do not explain
- If unclear, use:
{"action":"speak","message":"I did not understand. Please repeat."}

User command: "${command}"
          `
        })
      });

      const data = await response.json();
      try {
        return JSON.parse(data.response);
      } catch {
        return null;
      }
    } catch (error) {
      console.error('AI service error:', error);
      return null;
    }
  }
}