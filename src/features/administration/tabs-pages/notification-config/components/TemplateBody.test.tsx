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

describe('TemplateBody', () => {
    it('renders common placeholders by default and inserts tag on click', () => {
        const handleChange = vi.fn();
        const { getByText, getByPlaceholderText } = renderWithIntl(
            <TemplateBody value="Hello" onChange={handleChange} />
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

    it('renders all default placeholders directly and inserts tag on click', () => {
        const handleChange = vi.fn();
        const { getByText, getByPlaceholderText } = renderWithIntl(
            <TemplateBody value="" onChange={handleChange} />
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

    it('does not insert when disabled', () => {
        const handleChange = vi.fn();
        const { getByText } = renderWithIntl(
            <TemplateBody value="Static" onChange={handleChange} disabled={true} />
        );

        const button = getByText('{ticket_number}');
        fireEvent.click(button);

        expect(handleChange).not.toHaveBeenCalled();
    });

    it('inserts at cursor position when textarea is focused', () => {
        const handleChange = vi.fn();
        const { getByText, getByPlaceholderText } = renderWithIntl(
            <TemplateBody value="Hello world" onChange={handleChange} />
        );

        const textarea = getByPlaceholderText('Enter template body here...') as HTMLTextAreaElement;
        textarea.focus();
        textarea.setSelectionRange(6, 6); // right after "Hello "

        const button = getByText('{ticket_number}');
        fireEvent.click(button);

        expect(handleChange).toHaveBeenCalledWith('Hello {ticket_number}world');
    });
});
