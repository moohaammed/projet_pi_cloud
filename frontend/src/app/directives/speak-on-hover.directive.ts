import { Directive, Input, HostListener, inject, ElementRef } from '@angular/core';
import { GuidanceService } from '../services/collaboration/guidance.service';

/**
 * Usage:
 *   <button speakOnHover="Send" hoverContextType="button" hoverPage="messenger">Send</button>
 *   <div speakOnHover="Ahmed wrote: Feeling better today" hoverContextType="post" hoverPage="feed">...</div>
 *
 * - speakOnHover   : the raw content/label to describe (required)
 * - hoverContextType: "button" | "post" | "message" | "notification" | "group" | "person" | "input" | "page"
 *                     defaults to "button"
 * - hoverPage      : current page name, defaults to "app"
 *
 * On hover (after 500ms debounce), calls GuidanceService.describeOnHover()
 * which hits the AI endpoint and speaks the result immediately.
 */
@Directive({
  selector: '[speakOnHover]',
  standalone: true
})
export class SpeakOnHoverDirective {
  @Input('speakOnHover')      hoverText        = '';
  @Input('hoverContextType')  hoverContextType = 'button';
  @Input('hoverPage')         hoverPage        = 'app';

  private guidance = inject(GuidanceService);

  @HostListener('mouseenter')
  onEnter() {
    if (!this.hoverText || !this.guidance.voiceUnlocked()) return;
    this.guidance.describeOnHover(this.hoverContextType, this.hoverText, this.hoverPage);
  }

  @HostListener('mouseleave')
  onLeave() {
    this.guidance.cancelHover();
  }
}
