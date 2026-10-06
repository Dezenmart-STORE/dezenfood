import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

type Fn = (...args: unknown[]) => Promise<unknown>;
const resolve = vi.fn<Fn>();
const submit = vi.fn<Fn>();
const unwrap = (fn: Fn) => (...args: unknown[]) => ({ unwrap: () => fn(...args) });

vi.mock('../../store/api', () => ({
  useGetBanksQuery: () => ({ data: [{ code: '044', name: 'Access Bank' }, { code: '058', name: 'GTBank' }] }),
  useResolveBankAccountMutation: () => [unwrap(resolve), { isLoading: false }],
  useSubmitRefundAccountMutation: () => [unwrap(submit), { isLoading: false }],
}));

import RefundAccountForm from '../../components/trade/RefundAccountForm';

const order = { _id: 'o1', refund: { status: 'awaiting_account', amount: 10500 } } as never;

describe('RefundAccountForm', () => {
  beforeEach(() => {
    resolve.mockReset();
    submit.mockReset();
  });

  it('shows the amount owed and blocks lookup until bank and a 10-digit number are given', async () => {
    const user = userEvent.setup();
    render(<RefundAccountForm order={order} />);
    expect(screen.getByText(/10,500/)).toBeInTheDocument();
    const check = screen.getByRole('button', { name: /check account/i });
    expect(check).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('Bank'), '058');
    await user.type(screen.getByLabelText('Account number'), '12345');
    expect(check).toBeDisabled();
    await user.type(screen.getByLabelText('Account number'), '67890');
    expect(check).toBeEnabled();
  });

  it('only allows sending after the bank-verified name is shown, then submits that account', async () => {
    resolve.mockResolvedValue({ accountName: 'ADA BUYER' });
    submit.mockResolvedValue({});
    const user = userEvent.setup();
    render(<RefundAccountForm order={order} />);
    expect(screen.queryByRole('button', { name: /send my refund/i })).toBeNull();

    await user.selectOptions(screen.getByLabelText('Bank'), '058');
    await user.type(screen.getByLabelText('Account number'), '1234567890');
    await user.click(screen.getByRole('button', { name: /check account/i }));
    expect(resolve).toHaveBeenCalledWith({ bankCode: '058', accountNumber: '1234567890' });
    expect(await screen.findByText('ADA BUYER')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /send my refund/i }));
    expect(submit).toHaveBeenCalledWith({ orderId: 'o1', bankCode: '058', accountNumber: '1234567890' });
  });

  it('forgets the verified name when the account number changes', async () => {
    resolve.mockResolvedValue({ accountName: 'ADA BUYER' });
    const user = userEvent.setup();
    render(<RefundAccountForm order={order} />);
    await user.selectOptions(screen.getByLabelText('Bank'), '044');
    await user.type(screen.getByLabelText('Account number'), '1234567890');
    await user.click(screen.getByRole('button', { name: /check account/i }));
    await screen.findByText('ADA BUYER');
    await user.type(screen.getByLabelText('Account number'), '1');
    await waitFor(() => expect(screen.queryByText('ADA BUYER')).toBeNull());
    expect(screen.queryByRole('button', { name: /send my refund/i })).toBeNull();
  });

  it('surfaces lookup errors and does not submit', async () => {
    resolve.mockRejectedValue({ status: 422, data: { message: 'Could not verify that bank account' } });
    const user = userEvent.setup();
    render(<RefundAccountForm order={order} />);
    await user.selectOptions(screen.getByLabelText('Bank'), '044');
    await user.type(screen.getByLabelText('Account number'), '1234567890');
    await user.click(screen.getByRole('button', { name: /check account/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it('says so when a previous refund attempt failed', () => {
    render(<RefundAccountForm order={{ _id: 'o1', refund: { status: 'failed', amount: 100 } } as never} />);
    expect(screen.getByText(/didn't go through/i)).toBeInTheDocument();
  });
});
