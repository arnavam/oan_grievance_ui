// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CaseManagement } from './CaseManagement';
import { metadataReducer, type MetadataState } from '@/features/metadata/store/metadataSlice';
import type { GrievanceTimelineData } from '../../types';

afterEach(cleanup);

const mockTimelineData: GrievanceTimelineData = {
  ticket_number: 'ET14IN000012026',
  status: 'In Progress',
  escalated: false,
  assignment: {
    department: 'Inputs Supply & Distribution Agency',
    assigned_to: 'Tigist Alemu',
  },
};

const mockDepartments = [
  { department_id: 'dept-1', department_name: 'Inputs Supply & Distribution Agency' },
  { department_id: 'dept-2', department_name: 'Credit & Financial Services' },
  { department_id: 'dept-3', department_name: 'Market Development & Trade Bureau' },
];

function renderWithStore(ui: React.ReactElement, initialDepartments = mockDepartments) {
  const initialMetadataState: MetadataState = {
    submitterOptions: null,
    submitterOptionsStatus: 'idle',
    submitterOptionsError: null,
    grievanceOptions: {
      departments: initialDepartments,
      submission_channels: [],
      service_categories: [],
      grievance_types: [],
      statuses: [],
    },
    grievanceOptionsStatus: 'succeeded',
    grievanceOptionsError: null,
    selectedLanguage: 'en',
  };

  const store = configureStore({
    reducer: {
      metadata: metadataReducer,
    },
    preloadedState: {
      metadata: initialMetadataState,
    },
  });
  // `wrapper` (not wrapping `ui` inline) so a test's rerender() keeps the Provider.
  return render(ui, { wrapper: ({ children }) => <Provider store={store}>{children}</Provider> });
}

describe('CaseManagement', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // jsdom doesn't implement scrollIntoView, which AnimatedSelect calls on the highlighted option.
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders nothing when canManageCase is false', () => {
    const { container } = renderWithStore(
      <CaseManagement
        canManageCase={false}
        timelineData={mockTimelineData}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders department and case management header', () => {
    renderWithStore(
      <CaseManagement
        canManageCase={true}
        timelineData={mockTimelineData}
      />
    );

    expect(screen.getByText('Case Management')).toBeInTheDocument();
    expect(screen.getByText('Department')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Department' })).toHaveValue('Inputs Supply & Distribution Agency');
  });

  it('shows message when saving without changes', async () => {
    renderWithStore(
      <CaseManagement
        canManageCase={true}
        timelineData={mockTimelineData}
        onReassign={vi.fn()}
      />
    );

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/No department changes to save/i)).toBeInTheDocument();
    });
  });

  it('shows justification and calls onReassign when department is modified', async () => {
    const onReassign = vi.fn().mockResolvedValue({
      ticket_number: 'ET14IN000012026',
      status: 'Assigned',
      change_request: {
        status: 'Pending',
      },
    });

    renderWithStore(
      <CaseManagement
        canManageCase={true}
        timelineData={mockTimelineData}
        onReassign={onReassign}
      />
    );

    // Open Department combobox from the keyboard, then pick Credit & Financial Services
    const combobox = screen.getByRole('combobox', { name: 'Department' });
    combobox.focus();
    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    fireEvent.click(screen.getByRole('option', { name: 'Credit & Financial Services' }));

    // Reassignment justification box should appear
    expect(screen.getByText('Reassignment Justification')).toBeInTheDocument();
    expect(
      screen.getByText(/Junior officer reassignment requests will be routed to your supervisor/i)
    ).toBeInTheDocument();

    const reasonInput = screen.getByPlaceholderText(/Provide justification for routing to this department/i);
    fireEvent.change(reasonInput, { target: { value: 'Dispute relates to farmer credit facility' } });

    // Click Submit Reassignment Request button
    const submitBtn = screen.getByRole('button', { name: /Submit Reassignment Request/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onReassign).toHaveBeenCalledWith({
        target_department: 'Credit & Financial Services',
        reason: 'Dispute relates to farmer credit facility',
      });
      expect(
        screen.getByText(/Reassignment request submitted \(pending supervisor approval\)/i)
      ).toBeInTheDocument();
    });
  });
});
