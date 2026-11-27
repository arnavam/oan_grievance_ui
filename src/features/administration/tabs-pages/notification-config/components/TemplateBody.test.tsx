/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../../messages/en.json';
import { TemplateBody } from './TemplateBody';

const renderWithIntl = (ui: React.ReactElement) => {
    return render(
        <NextIntlClientProvider locale="en" messages={en}>
            {ui}
        </NextIntlClientProvider>
    );
};

const SERVICE_PLACEHOLDERS = [
    { key: '{ticket_number}', label: 'Ticket Number' },
    { key: '{service_category}', label: 'Category' },
    { key: '{status}', label: 'Status' },
    { key: '{closure_reason}', label: 'Closure Reason' },
    { key: '{submitter_name}', label: 'Submitter Name' },
];

describe('TemplateBody', () => {
    it('renders the placeholders the service sent and inserts tag on click', () => {
        const handleChange = vi.fn();
        const { getByText, getByPlaceholderText } = renderWithIntl(
            <TemplateBody value="Hello" onChange={handleChange} placeholders={SERVICE_PLACEHOLDERS} />
        );

        expect(getByPlaceholderText('Enter template body here...')).toBeTruthy();
        expect(getByText('{ticket_number}')).toBeTruthy();
        expect(getByText('{service_category}')).toBeTruthy();
        expect(getByText('{status}')).toBeTruthy();

        // Click a common variable button
        const button = getByText('{ticket_number}');
        fireEvent.click(button);

        expect(handleChange).toHaveBeenCalledWith('Hello {ticket_number}');
    });

    it('renders every placeholder the service sent and inserts tag on click', () => {
        const handleChange = vi.fn();
        const { getByText, getByPlaceholderText } = renderWithIntl(
            <TemplateBody value="" onChange={handleChange} placeholders={SERVICE_PLACEHOLDERS} />
        );

        expect(getByPlaceholderText('Enter template body here...')).toBeTruthy();
        expect(getByText('{closure_reason}')).toBeTruthy();
        expect(getByText('{submitter_name}')).toBeTruthy();

        // Clicking placeholder triggers onChange
        fireEvent.click(getByText('{closure_reason}'));
        expect(handleChange).toHaveBeenCalledWith('{closure_reason}');
    });

    it('uses custom placeholders prop when provided, supporting API items with name', () => {
        const handleChange = vi.fn();
        const customPlaceholders = [
            {
                name: 'custom_token',
                label: 'Custom Field',
                description: 'A test custom token',
                example: 'Val-1',
            },
        ];

        const { getByText, queryByText } = renderWithIntl(
            <TemplateBody
                value="Dear User"
                onChange={handleChange}
                placeholders={customPlaceholders}
            />
        );

        expect(getByText('{custom_token}')).toBeTruthy();
        expect(queryByText('{ticket_number}')).toBeNull();
    });

    it('offers no variables, and says so, when the service sent none', () => {
        const { getByText, queryByText } = renderWithIntl(<TemplateBody value="" onChange={vi.fn()} />);
        expect(getByText('No variables are available for this template.')).toBeTruthy();
        expect(queryByText('{ticket_number}')).toBeNull();
    });

    it('does not insert when disabled', () => {
        const handleChange = vi.fn();
        const { getByText } = renderWithIntl(
            <TemplateBody value="Static" onChange={handleChange} disabled={true} placeholders={SERVICE_PLACEHOLDERS} />
        );

        const button = getByText('{ticket_number}');
        fireEvent.click(button);

        expect(handleChange).not.toHaveBeenCalled();
    });

    it('inserts at cursor position when textarea is focused', () => {
        const handleChange = vi.fn();
        const { getByText, getByPlaceholderText } = renderWithIntl(
            <TemplateBody value="Hello world" onChange={handleChange} placeholders={SERVICE_PLACEHOLDERS} />
        );

        const textarea = getByPlaceholderText('Enter template body here...') as HTMLTextAreaElement;
        textarea.focus();
        textarea.setSelectionRange(6, 6); // right after "Hello "

        const button = getByText('{ticket_number}');
        fireEvent.click(button);

        expect(handleChange).toHaveBeenCalledWith('Hello {ticket_number}world');
    });
});
