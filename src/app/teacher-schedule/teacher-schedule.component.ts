import { Component } from '@angular/core';
import { ScheduleService } from '../services/emploie.service';
import html2pdf from 'html2pdf.js';
import { Location } from '@angular/common';

interface TimetableSlot {
  subject: string;
  className: string;
  level: string;
}

@Component({
  selector: 'app-teacher-schedule',
  templateUrl: './teacher-schedule.component.html',
  styleUrls: ['./teacher-schedule.component.scss']
})
export class TeacherScheduleComponent {
  days: string[] = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  hours: string[] = [];
  timetable: { [hour: string]: { [day: string]: TimetableSlot | null } } = {};
  displayedColumns: string[] = ["hour", ...this.days];
  subjectColors: { [subject: string]: string } = {};
  predefinedColors: string[] = [
    '#FF5733', '#33FF57', '#3357FF', '#F2C300', '#FF8C00',
    '#8A2BE2', '#FF1493', '#20B2AA', '#FFD700', '#ADFF2F',
    '#F08080', '#C71585', '#4682B4', '#7FFF00', '#D2691E',
    '#DC143C', '#B0C4DE', '#FF6347', '#98FB98', '#FFFACD'
  ];

  selectedTeacher: string = '';
  loading: boolean = false;
  errorMessage: string = '';
  teacherFound: boolean = false;

  constructor(
    private scheduleService: ScheduleService,
    private location: Location
  ) {}

  goBack(): void {
    this.location.back();
  }

  fetchTeacherSchedule(): void {
    if (!this.selectedTeacher.trim()) {
      this.errorMessage = 'Veuillez entrer un nom d\'enseignant valide.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.teacherFound = false;
    this.timetable = {};
    this.hours = [];
    this.subjectColors = {};

    this.scheduleService.getScheduleForTeacher(this.selectedTeacher).subscribe({
      next: (data) => {
        if (data.length === 0) {
          this.errorMessage = 'Aucun cours trouvé pour cet enseignant.';
          return;
        }
        this.processData(data);
        this.teacherFound = true;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors du chargement des données.';
        console.error(err);
      }
    }).add(() => {
      this.loading = false;
    });
  }

  private processData(sessions: any[]): void {
    this.hours = [...new Set(sessions.map(s => s.time))].sort((a, b) => {
      const timeA = this.convertToMinutes(a.split('-')[0]);
      const timeB = this.convertToMinutes(b.split('-')[0]);
      return timeA - timeB;
    });

    this.hours.forEach(hour => {
      this.timetable[hour] = {};
      this.days.forEach(day => {
        this.timetable[hour][day] = null;
      });
    });

    sessions.forEach(session => {
      if (this.timetable[session.time] && this.timetable[session.time][session.day] === null) {
        this.timetable[session.time][session.day] = {
          subject: session.subject,
          className: session.className,
          level: session.level
        };
        this.assignSubjectColor(session.subject);
      }
    });
  }

  private convertToMinutes(timeStr: string): number {
    const match = timeStr.toLowerCase().match(/(\d+)(am|pm)/);
    if (!match) return 0;

    let hours = parseInt(match[1]);
    const period = match[2];

    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;

    return hours * 60;
  }

  private assignSubjectColor(subject: string): void {
    if (!this.subjectColors[subject]) {
      const colorIndex = this.hashStringToIndex(subject);
      this.subjectColors[subject] = this.predefinedColors[colorIndex];
    }
  }

  private hashStringToIndex(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % this.predefinedColors.length;
  }

  async downloadPDF(): Promise<void> {
    const element = document.getElementById('pdf-export-content');
    const fileName = `Emploi_${this.selectedTeacher}_${new Date().toISOString().slice(0,10)}.pdf`;

    const opt = {
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
      },
      pagebreak: { mode: 'avoid-all' }
    };

    if (element) {
      try {
        await html2pdf().from(element).set(opt).save();
      } catch (error) {
        console.error('Erreur lors de la génération du PDF:', error);
      }
    }
  }

  getCellStyle(hour: string, day: string): any {
    const session = this.timetable[hour]?.[day];
    if (!session) return {};

    return {
      'background-color': this.subjectColors[session.subject],
      'color': '#ffffff',
      'border-radius': '4px',
      'padding': '8px'
    };
  }
}
