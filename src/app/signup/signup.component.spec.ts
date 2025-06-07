import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignupAdminComponent } from './signup.component';

describe('SignupComponent', () => {
  let component: SignupAdminComponent;
  let fixture: ComponentFixture<SignupAdminComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SignupAdminComponent]
    });
    fixture = TestBed.createComponent(SignupAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
