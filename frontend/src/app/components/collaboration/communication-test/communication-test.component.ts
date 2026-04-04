import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MiniChatWidgetComponent } from '../mini-chat-widget/mini-chat-widget.component';
 
@Component({
  selector: 'app-communication-test',
  standalone: true,
  imports: [CommonModule, RouterModule, MiniChatWidgetComponent],
  templateUrl: './communication-test.component.html',
  styles: [`
    .max-h-500 { max-height: 500px; }
    .cursor-pointer { cursor: pointer; }
    .transition-all { transition: all 0.2s ease-in-out; }
    .hover-bg-light:hover { background-color: #f8f9fa !important; }
    .shadow-soft-primary { box-shadow: 0 10px 30px -10px rgba(0, 107, 230, 0.2) !important; }
    .btn-soft-primary { background: rgba(0, 107, 230, 0.1); color: #006be6; border: none; }
    .btn-soft-primary:hover { background: rgba(0, 107, 230, 0.2); }
    .animate-fade-in { animation: fadeIn 0.5s ease-out; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .leading-relaxed { line-height: 1.6; }
    .message-bubble:hover { transform: translateY(-3px); transition: transform 0.2s; }
  `]
})
export class CommunicationTestComponent {
  // Local Mock State
  pollVotes = signal<number[]>([42, 58]);
  pinnedMessages = signal<any[]>([]);
 
  sampleMessages = [
    { id: 1, author: 'Dr. Mike', time: '10:15 AM', content: 'Patient B was very agitated today during therapy. Avoid loud music tonight in the shared wing.' },
    { id: 2, author: 'Caregiver Anna', time: '09:45 AM', content: 'The new specialized diet plan for Mrs. Henderson is ready. Please ensure she consumes only the labeled meals.' },
    { id: 3, author: 'Nurse Sarah', time: '11:20 AM', content: 'Physical therapist will arrive at 1:00 PM instead of 1:30 PM today.' },
    { id: 4, author: 'Admin Leo', time: 'Yesterday', content: 'Welcome to the new coordination dashboard! Happy to see everyone collaborating.' }
  ];
 
  vote(index: number) {
    const current = [...this.pollVotes()];
    current[index] += 2; // Simulate voting
    // Rebalance for mock visual (oversimplified)
    const other = index === 0 ? 1 : 0;
    current[other] -= 1;
    if (current[other] < 0) current[other] = 0;
    this.pollVotes.set(current);
  }
 
  pinMessage(msg: any) {
    if (!this.pinnedMessages().some(m => m.id === msg.id)) {
      this.pinnedMessages.set([msg, ...this.pinnedMessages()]);
    }
  }
 
  unpinMessage(id: number) {
    this.pinnedMessages.set(this.pinnedMessages().filter(m => m.id !== id));
  }
}
