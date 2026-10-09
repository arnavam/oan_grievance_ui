/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { fetchGrievanceOptionsThunk } from '@/features/metadata';
import { makeStore } from '@/store';
import { AddOfficerModal } from './AddOfficerModal';

const fetchCategoryAssignments = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    assignments: [{ name: 'GR-RBAC-00001', service_category: 'Inputs', department: 'Ministry of Agriculture', active: true }],
    pagination: { page: 1, page_size: 100, total_count: 1, total_pages: 1, has_next: false, has_prev: false },
  })
);
vi.mock('../api/officerApi', () => ({ fetchCategoryAssignments }));

function renderModal(onAdd = vi.fn(), tabLabel = 'Admin') {
  const store = makeStore();
  // Seeds the Department dropdown the same way a real fetchGrievanceOptionsThunk
  // resolution would, without hitting the network.
  store.dispatch({
    type: fetchGrievanceOptionsThunk.fulfilled.type,
    payload: { departments: [{ department_name: 'Ministry of Agriculture' }] },
  });
  render(
    <Provider store={store}>
      <AddOfficerModal isOpen onClose={vi.fn()} tabLabel={tabLabel} onAdd={onAdd} />
    </Provider>
  );
  return onAdd;
}

function selectDropdownOption(labelText: string, optionText: string) {
  fireEvent.click(screen.getByText(labelText));
  fireEvent.click(screen.getByText(optionText));
}

async function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText('Full Name *'), { target: { value: 'Test Officer' } });
  fireEvent.change(screen.getByLabelText('Role Title *'), { target: { value: 'Case Officer' } });
  selectDropdownOption('Select Department', 'Ministry of Agriculture');
  // The category tag-buttons only render once the department-scoped fetch resolves.
  fireEvent.click(await screen.findByRole('button', { name: 'Inputs' }));
}

describe('AddOfficerModal', () => {
  it('blocks submission and shows inline errors when required fields are empty', () => {
    const onAdd = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('Enter your full name.')).toBeTruthy();
    expect(screen.getByText('Enter a role title.')).toBeTruthy();
    expect(screen.getByText('Select a department.')).toBeTruthy();
    expect(screen.getByText('Select at least one service category.')).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("shows no category buttons until a department is chosen, then only offers that department's wired categories", async () => {
    renderModal();

    expect(screen.getByText('Select a department first.')).toBeTruthy();

    selectDropdownOption('Select Department', 'Ministry of Agriculture');

    expect(await screen.findByRole('button', { name: 'Inputs' })).toBeTruthy();
    expect(fetchCategoryAssignments).toHaveBeenCalledWith(
      expect.objectContaining({ department: 'Ministry of Agriculture', active: true }),
      expect.anything()
    );
  });

  it('clears previously-chosen categories when the department changes', async () => {
    const store = makeStore();
    store.dispatch({
      type: fetchGrievanceOptionsThunk.fulfilled.type,
      payload: {
        departments: [{ department_name: 'Ministry of Agriculture' }, { department_name: 'Regional Bureau of Agriculture' }],
      },
    });
    render(
      <Provider store={store}>
        <AddOfficerModal isOpen onClose={vi.fn()} tabLabel="Admin" onAdd={vi.fn()} />
      </Provider>
    );

    selectDropdownOption('Select Department', 'Ministry of Agriculture');
    const inputsButton = await screen.findByRole('button', { name: 'Inputs' });
    fireEvent.click(inputsButton);
    expect(inputsButton.className).toContain('bg-[#16A34A]');

    // Switching to a different department re-triggers the fetch and resets the
    // category selection, since the old pick may not be wired under the new one.
    selectDropdownOption('Ministry of Agriculture', 'Regional Bureau of Agriculture');

    const inputsButtonAgain = await screen.findByRole('button', { name: 'Inputs' });
    expect(inputsButtonAgain.className).not.toContain('bg-[#16A34A]');
  });

  it('rejects a malformed phone number for the selected country (Ethiopia by default)', async () => {
    const onAdd = renderModal();

    await fillRequiredFields();
    fireEvent.change(screen.getByPlaceholderText('Enter Phone Number'), { target: { value: '123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText(/Enter a valid Ethiopian mobile number/)).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('accepts a valid form, sends the phone number in E.164, and carries the chosen department/categories', async () => {
    const onAdd = renderModal();

    await fillRequiredFields();
    fireEvent.change(screen.getByPlaceholderText('Enter Phone Number'), { target: { value: '911234567' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Officer',
        roleTitle: 'Case Officer',
        phone: '+251911234567',
        department: 'Ministry of Agriculture',
        tags: ['Inputs'],
      })
    );
  });

  it('pre-fills a valid temporary password and marks the new officer as awaiting first sign-in', async () => {
    const onAdd = renderModal(vi.fn(), 'Reviewer');

    const passwordField = screen.getByLabelText('Temporary Password *') as HTMLInputElement;
    expect(passwordField.value.length).toBeGreaterThanOrEqual(8);

    await fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ mustChangePassword: true }));
  });

  it('rejects an empty temporary password', async () => {
    const onAdd = renderModal();

    await fillRequiredFields();
    fireEvent.change(screen.getByLabelText('Temporary Password *'), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('Enter a temporary password.')).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();
  });
});
