/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { areasApi } from '@/features/metadata/api/areasApi';
import type { AreaRef } from '@/features/metadata';
import type { AdministrativeArea } from '@/features/metadata/types';
import { AreaFilterDropdown } from './AreaFilterDropdown';

const fetchAdministrativeAreas = vi.hoisted(() => vi.fn());
vi.mock('@/features/metadata/api/metadataApi', () => ({ fetchAdministrativeAreas }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const kebele = (id: string, name: string, parent: string): AdministrativeArea => ({
  area_id: id,
  area_name: name,
  code: id,
  path_code: `ET.${parent}.${id}`,
  level_name: 'Kebele',
  parent_administrative_area: parent,
  is_group: 0,
  depth: 5,
});

const woredas: AreaRef[] = [
  { id: 'woreda-A', name: 'Basona Werana', pathCode: 'ET.woreda-A' },
  { id: 'woreda-B', name: 'Dessie Zuria', pathCode: 'ET.woreda-B' },
];

function Harness({ onChange }: { onChange: (next: AreaRef[]) => void }) {
  const [selected, setSelected] = useState<AreaRef[]>([]);
  return (
    <AreaFilterDropdown
      label="Kebeles"
      level="Kebele"
      parents={woredas}
      selected={selected}
      onChange={(next) => {
        setSelected(next);
        onChange(next);
      }}
    />
  );
}

function renderDropdown() {
  const store = configureStore({
    reducer: { [areasApi.reducerPath]: areasApi.reducer },
    middleware: (getDefault) => getDefault().concat(areasApi.middleware),
  });
  const onChange = vi.fn();
  render(
    <Provider store={store}>
      <Harness onChange={onChange} />
    </Provider>
  );
  return { onChange };
}

describe('AreaFilterDropdown', () => {
  it('keys options by area_id and names the woreda when a kebele name repeats', async () => {
    fetchAdministrativeAreas.mockResolvedValue({
      areas: [kebele('kebele-A1', '01', 'woreda-A'), kebele('kebele-B1', '01', 'woreda-B')],
      count: 2,
    });
    const { onChange } = renderDropdown();

    fireEvent.click(await screen.findByText('Select Kebeles'));
    fireEvent.click(await screen.findByLabelText('01 (Dessie Zuria)'));

    expect(onChange).toHaveBeenLastCalledWith([
      { id: 'kebele-B1', name: '01', pathCode: 'ET.woreda-B.kebele-B1' },
    ]);
  });

  it('asks the backend once for a parent set, however often the selection re-renders', async () => {
    fetchAdministrativeAreas.mockResolvedValue({ areas: [kebele('kebele-A1', '01', 'woreda-A')], count: 1 });
    renderDropdown();

    fireEvent.click(await screen.findByText('Select Kebeles'));
    fireEvent.click(await screen.findByLabelText('01'));
    fireEvent.click(screen.getByLabelText('01'));
    fireEvent.click(screen.getByLabelText('01'));

    expect(fetchAdministrativeAreas).toHaveBeenCalledTimes(1);
    expect(fetchAdministrativeAreas.mock.calls[0]![0]).toMatchObject({
      level_name: 'Kebele',
      parent: ['woreda-A', 'woreda-B'],
    });
  });
});
