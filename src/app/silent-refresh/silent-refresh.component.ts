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
        var checks = [/[\?|&|#]token=/, /[\?|&|#]id_token=/];

        function isResponse(str) {
            if (!str) return false;
            for(var i=0; i<checks.length; i++) {
                if (str.match(checks[i])) return true;
            }
            return false;
        }
        var message = isResponse(location.hash) ? location.hash : '#' + location.search;
        window.opener.postMessage(message, location.origin);
        `;

    this.renderer2.appendChild(this.document.body, script);
  }
}
