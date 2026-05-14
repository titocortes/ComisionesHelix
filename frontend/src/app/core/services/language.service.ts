import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  constructor(private translate: TranslateService) {}

  init(): void {
    this.translate.addLangs(['en', 'es']);
    this.translate.setDefaultLang('en');
    this.translate.setFallbackLang('en');
    const browserLang = navigator.language?.toLowerCase() ?? 'en';
    const active = browserLang.startsWith('es') ? 'es' : 'en';
    this.translate.use(active);
  }
}
