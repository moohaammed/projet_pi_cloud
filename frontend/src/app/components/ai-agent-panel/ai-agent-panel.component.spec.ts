import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiAgentPanelComponent } from './ai-agent-panel.component';

describe('AiAgentPanelComponent', () => {
  let component: AiAgentPanelComponent;
  let fixture: ComponentFixture<AiAgentPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiAgentPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AiAgentPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
