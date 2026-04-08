// src/app.tsx
import { useState } from 'react';
import moment from 'moment';
import { DateTimePeriodPicker } from './components/date/period-picker';
import type { DatePeriod } from './components/date/period-picker';
import { DateTimePicker } from './components/date/picker';

export function App() {
  const [datePeriod, setDatePeriod] = useState<DatePeriod>({
    initial: '',
    final: '',
  });

  const [dateTimePeriod, setDateTimePeriod] = useState<DatePeriod>({
    initial: '',
    final: '',
  });

  const [singleDate, setSingleDate] = useState('');
  const [singleDateTime, setSingleDateTime] = useState('');

  moment.locale('pt-BR');

  return (
    <main>
      <h2>DateTime Period Picker</h2>

      <div className="components">
        <section>
          <h3>Variante: date</h3>
          <DateTimePeriodPicker
            name="datePeriod"
            variant="date"
            value={datePeriod}
            onChange={(e) => setDatePeriod(e.target.value)}
          />
          <pre>{JSON.stringify(datePeriod, null, 2)}</pre>
        </section>

        <section>
          <h3>Variante: datetime</h3>
          <DateTimePeriodPicker
            name="dateTimePeriod"
            variant="datetime"
            value={dateTimePeriod}
            onChange={(e) => setDateTimePeriod(e.target.value)}
          />
          <pre>{JSON.stringify(dateTimePeriod, null, 2)}</pre>
        </section>
      </div>

      <h2>DateTime Picker</h2>

      <div className="components">
        <section>
          <h3>Variante: date</h3>
          <DateTimePicker
            name="singleDate"
            variant="date"
            value={singleDate}
            onChange={(e) => setSingleDate(e.target.value)}
            label="Data"
          />
          <pre>{JSON.stringify(singleDate)}</pre>
        </section>

        <section>
          <h3>Variante: datetime</h3>
          <DateTimePicker
            name="singleDateTime"
            variant="datetime"
            value={singleDateTime}
            onChange={(e) => setSingleDateTime(e.target.value)}
            label="Data e hora"
          />
          <pre>{JSON.stringify(singleDateTime)}</pre>
        </section>
      </div>
    </main>
  );
}
