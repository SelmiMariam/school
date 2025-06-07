import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Component({
  selector: 'app-signup-admin',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupAdminComponent implements OnInit {
  adminForm!: FormGroup;
  hidePassword = true;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    private afAuth: AngularFireAuth
  ) { }

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.adminForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      adminKey: ['', [Validators.required]]
    });
  }

  async onSubmit(): Promise<void> {
    if (this.adminForm.invalid) return;

    const formValue = this.adminForm.value;
    const { email, password, firstName, lastName, adminKey } = formValue;

    try {
      // Création du compte Firebase
      const userCredential = await this.afAuth.createUserWithEmailAndPassword(email, password);
      
      // Préparation des données pour la base de données
      const userData = {
        uid: userCredential.user?.uid,
        firstName,
        lastName,
        email,
        role: 'admin',
        adminKey,
        createdAt: new Date()
      };

      // Appel au service pour sauvegarder dans MongoDB
      this.userService.addUser(this.adminForm.value).subscribe({
        next: () => {
          this.successMessage = 'Administrateur créé avec succès !';
          setTimeout(() => this.router.navigate(['/login']), 2000);
        },
        error: (err) => {
          console.error('Erreur MongoDB:', err);
          this.errorMessage = 'Erreur lors de la sauvegarde des données';
          // Suppression du compte Firebase si échec MongoDB
          userCredential.user?.delete();
        }
      });

    } catch (error: any) {
      this.handleAuthError(error);
    }
  }

  private handleAuthError(error: any): void {
    console.error('Erreur Firebase:', error);
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        this.errorMessage = 'Cet email est déjà utilisé';
        break;
      case 'auth/invalid-email':
        this.errorMessage = 'Format email invalide';
        break;
      case 'auth/weak-password':
        this.errorMessage = 'Le mot de passe doit contenir au moins 6 caractères';
        break;
      default:
        this.errorMessage = 'Une erreur est survenue lors de la création du compte';
    }
  }
}