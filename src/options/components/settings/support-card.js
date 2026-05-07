/**
 * SupportCard - Sponsor / support link card component
 */
import { CardComponent } from '../base/card-component.js';

const SPONSOR_URL = 'https://github.com/sponsors/badfalcon';

export class SupportCard extends CardComponent {
    constructor() {
        super({
            id: 'support-card',
            title: 'Support Development',
            titleLocalize: '__MSG_supportCardTitle__',
            subtitle: 'If you find this extension useful, you can support its development.',
            subtitleLocalize: '__MSG_supportCardSubtitle__',
            icon: 'fas fa-heart',
            iconColor: 'text-danger'
        });
    }

    createElement() {
        const card = super.createElement();
        this.addContent(this._createSponsorSection());
        return card;
    }

    _createSponsorSection() {
        const container = document.createElement('div');
        container.className = 'd-flex flex-wrap gap-2 align-items-center';

        const sponsorLink = document.createElement('a');
        sponsorLink.href = SPONSOR_URL;
        sponsorLink.target = '_blank';
        sponsorLink.rel = 'noopener noreferrer';
        sponsorLink.className = 'btn btn-outline-danger';

        const icon = document.createElement('i');
        icon.className = 'fas fa-heart me-2';
        sponsorLink.appendChild(icon);

        const label = document.createElement('span');
        label.textContent = 'Sponsor on GitHub';
        label.setAttribute('data-localize', '__MSG_supportSponsorButton__');
        sponsorLink.appendChild(label);

        container.appendChild(sponsorLink);
        return container;
    }
}
