import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckoutModal from '../../components/CheckoutModal/CheckoutModal';
import api from '../../api/api';

vi.mock('../../api/api', () => ({
  default: {
    get:  vi.fn(),
    post: vi.fn(),
    interceptors: {
      request:  { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

const mockApi = api as unknown as {
  get:  ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

const defaultProps = {
  isOpen:        true,
  onClose:       vi.fn(),
  planType:      'individual' as const,
  planTier:      'Plus',
  billingPeriod: 'mensal' as const,
  priceLabel:    'R$ 24,90/mês',
  billingNote:   'Cobrado mensalmente',
};

function renderModal(overrides = {}) {
  return render(<CheckoutModal {...defaultProps} {...overrides} />);
}

// Helpers para preencher o formulário
function fillForm({ name = 'João Silva', email = 'joao@teste.com', password = 'senha123', confirm = 'senha123' } = {}) {
  fireEvent.change(screen.getByPlaceholderText('Seu nome'),          { target: { value: name } });
  fireEvent.change(screen.getByPlaceholderText('seu@email.com'),     { target: { value: email } });
  fireEvent.change(screen.getByPlaceholderText('Mínimo 8 caracteres'), { target: { value: password } });
  fireEvent.change(screen.getByPlaceholderText('Repita a senha'),    { target: { value: confirm } });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockApi.get.mockResolvedValue({ data: { data: [] } });
  mockApi.post.mockResolvedValue({ data: { url: null } });
});

describe('CheckoutModal — visibilidade', () => {
  it('não renderiza quando isOpen=false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText(/VestWeb Plus/i)).toBeNull();
  });

  it('renderiza quando isOpen=true', () => {
    renderModal();
    expect(screen.getByText('VestWeb Plus')).toBeInTheDocument();
  });

  it('chama onClose ao clicar no botão fechar', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('CheckoutModal — validação de formulário', () => {
  it('exibe erro quando nome ou e-mail estão vazios', async () => {
    renderModal();
    // Dispara submit diretamente no form para contornar validação nativa do jsdom
    const form = screen.getByRole('button', { name: /assinar agora/i }).closest('form')!;
    fireEvent.submit(form);
    await screen.findByText(/preencha nome e e-mail/i);
  });

  it('exibe erro quando a senha é muito curta', async () => {
    renderModal();
    fillForm({ password: '123', confirm: '123' });
    fireEvent.click(screen.getByRole('button', { name: /assinar agora/i }));
    await screen.findByText(/pelo menos 8 caracteres/i);
  });

  it('exibe erro quando senhas não coincidem', async () => {
    renderModal();
    fillForm({ password: 'senha123', confirm: 'outrasenha' });
    fireEvent.click(screen.getByRole('button', { name: /assinar agora/i }));
    await screen.findByText(/senhas não coincidem/i);
  });

  it('submete com dados válidos e chama a API corretamente', async () => {
    renderModal();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /assinar agora/i }));

    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith(
      '/payments/create-checkout-session',
      expect.objectContaining({ name: 'João Silva', email: 'joao@teste.com', planTier: 'Plus' }),
    ));
  });

  it('exibe erro quando a API falha', async () => {
    mockApi.post.mockRejectedValue(new Error('network error'));
    renderModal();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /assinar agora/i }));
    await screen.findByText(/erro ao iniciar o pagamento/i);
  });
});

describe('CheckoutModal — método de pagamento', () => {
  it('alterna para PIX ao clicar no botão PIX', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /pix/i }));
    expect(screen.getByText(/pagamento único/i)).toBeInTheDocument();
  });

  it('usa endpoint PIX ao submeter com PIX selecionado', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /pix/i }));
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /gerar qr code/i }));

    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith(
      '/payments/create-pix-session',
      expect.any(Object),
    ));
  });
});

describe('CheckoutModal — período de cobrança', () => {
  it('exibe preço mensal por padrão', () => {
    renderModal();
    expect(screen.getByText(/R\$ 24,90\/mês/i)).toBeInTheDocument();
  });

  it('atualiza preço ao selecionar anual', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /^anual/i }));
    expect(screen.getByText(/R\$ 16,66\/mês/i)).toBeInTheDocument();
  });
});
