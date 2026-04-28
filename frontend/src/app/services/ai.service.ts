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

You have TWO modes:

1. If the user asks for navigation, respond ONLY with JSON:
{"action":"navigate","target":"ROUTE"}

2. If the user is talking normally (chat, emotions, questions), respond with:
{"action":"speak","message":"your natural helpful answer"}

Allowed routes:
- /home
- /rendezvous
- /patient-dashboard
- /education
- /collaboration/messenger
- /events
- /collaboration/feed
- /donations

IMPORTANT:
- Always respond in JSON
- If it's NOT a navigation → ALWAYS use "speak"
- Be helpful, friendly, and natural

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