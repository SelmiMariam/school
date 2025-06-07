import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ScheduleService } from '../services/emploie.service';
import { Session } from '../models/emploie';
import html2pdf from 'html2pdf.js';
import { Location } from '@angular/common';

@Component({
  selector: 'app-emploie-affichage',
  templateUrl: './affiche-emploi.component.html',
  styleUrls: ['./affiche-emploi.component.scss']
})
export class EmploiAffichageComponent implements OnInit {
  sessions: Session[] = [];
  days: string[] = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  hours: string[] = [];
  timetable: { [hour: string]: { [day: string]: Session | null } } = {};
  displayedColumns: string[] = ["hour", ...this.days];
  selectedClass: string = '';
  loading: boolean = false;
  errorMessage: string = '';
  subjectColors: { [subject: string]: string } = {};
  classefound = false;

  predefinedColors: string[] = [
    "#FF5733", "#33FF57", "#3357FF", "#F2C300", "#FF8C00", 
    "#8A2BE2", "#FF1493", "#20B2AA", "#FFD700", "#ADFF2F",
    "#F08080", "#C71585", "#4682B4", "#7FFF00", "#D2691E"
  ];

  constructor(
    private scheduleService: ScheduleService, 
    private cdr: ChangeDetectorRef,
    private location: Location,
  ) {}

  ngOnInit(): void {}

  goBack(): void {
    this.location.back();
  }

  fetchSchedule(): void {
    if (!this.selectedClass.trim()) {
      this.errorMessage = 'Veuillez entrer une classe valide.';
      this.classefound = false;
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.sessions = [];

    this.scheduleService.getScheduleForClass(this.selectedClass).subscribe(
      (data) => {
        if (data && Array.isArray(data)) {
          this.sessions = data.flatMap(schedule => schedule.sessions || []);
        }

        if (this.sessions.length === 0) {
          this.errorMessage = 'Aucun emploi du temps trouvé pour cette classe.';
          this.classefound = false;
        } else {
          this.classefound = true;
        }

        this.processScheduleData();
        this.loading = false;
        this.cdr.detectChanges();
      },
      (error) => {
        this.errorMessage = 'Erreur lors du chargement de l\'emploi du temps.';
        this.loading = false;
        this.classefound = false;
      }
    );
  }

  private processScheduleData(): void {
    this.hours = [...new Set(this.sessions.map(session => session.time))]
      .sort((a, b) => this.compareTimes(a, b));

    this.timetable = {};
    this.hours.forEach(hour => {
      this.timetable[hour] = {};
      this.days.forEach(day => {
        this.timetable[hour][day] = null;
      });
    });

    this.sessions.forEach(session => {
      if (this.timetable[session.time] && this.timetable[session.time][session.day] !== undefined) {
        this.timetable[session.time][session.day] = session;
        this.assignSubjectColor(session.subject);
      }
    });
  }

  compareTimes(a: string, b: string): number {
    const [aStart] = a.split('-').map(time => this.convertTo24Hour(time));
    const [bStart] = b.split('-').map(time => this.convertTo24Hour(time));
    return aStart - bStart;
  }

  convertTo24Hour(time: string): number {
    const regex = /(\d+)(am|pm)/;
    const match = time.match(regex);

    if (!match) return 0;

    let hours = parseInt(match[1], 10);
    if (match[2] === 'pm' && hours !== 12) {
      hours += 12;
    } else if (match[2] === 'am' && hours === 12) {
      hours = 0;
    }
    return hours;
  }

  assignSubjectColor(subject: string): void {
    if (!this.subjectColors[subject]) {
      this.subjectColors[subject] = this.getUniqueColor(subject);
    }
  }

  getUniqueColor(subject: string): string {
    let hash = 0;
    for (let i = 0; i < subject.length; i++) {
      hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    }
    return this.predefinedColors[Math.abs(hash) % this.predefinedColors.length];
  }

  async downloadPDF(): Promise<void> {
    const element = document.getElementById('pdf-export-content');
    if (!element || !this.selectedClass) {
      console.error('Élément non trouvé ou classe non sélectionnée');
      return;
    }
  
    const fileName = `Emploi_${this.selectedClass}_${new Date().toISOString().slice(0,10)}.pdf`;
    
    const options = {
      margin: 15,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        scrollY: 0
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true
      }
    };
  
    try {
      await html2pdf().from(element).set(options).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  }
  
}