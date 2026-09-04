import { mongoSanitize } from './mongo-sanitize.middleware';

describe('mongoSanitize', () => {
  const run = (body: unknown, query: unknown = {}, params: unknown = {}) => {
    const req = { body, query, params };
    const next = jest.fn();
    mongoSanitize()(req as never, {} as never, next);
    expect(next).toHaveBeenCalledTimes(1);
    return req;
  };

  it('strips $-operator keys from nested objects', () => {
    const req = run({ email: { $ne: null } });
    expect(req.body).toEqual({ email: {} });
  });

  it('strips dotted keys', () => {
    const req = run({ 'settings.walletsEnabled': true, name: 'ok' });
    expect(req.body).toEqual({ name: 'ok' });
  });

  it('sanitizes arrays of objects', () => {
    const req = run({ ids: [{ $where: 'x' }, { ok: 1 }] });
    expect(req.body).toEqual({ ids: [{}, { ok: 1 }] });
  });

  it('mutates req.query in place rather than reassigning it (Express 5 getter-only property)', () => {
    const query = { $gt: 1, page: '2' };
    const req = run({}, query);
    expect(req.query).toBe(query); // same reference — never reassigned
    expect(req.query).toEqual({ page: '2' });
  });

  it('leaves clean payloads untouched', () => {
    const req = run({ email: 'a@b.com', nested: { ok: true } });
    expect(req.body).toEqual({ email: 'a@b.com', nested: { ok: true } });
  });
});
