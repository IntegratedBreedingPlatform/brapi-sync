import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';

@Component({
  selector: 'app-silent-refresh',
  templateUrl: './silent-refresh.component.html'
})
export class SilentRefreshComponent implements OnInit {

  constructor(
    private renderer2: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {
  }

  ngOnInit(): void {

    // Pass the response query string from login popup to the application
    const script = this.renderer2.createElement('script');
    script.text = `
        window.opener.postMessage(location.search, location.origin);
        window.close();
        `;

    this.renderer2.appendChild(this.document.body, script);
  }
}
