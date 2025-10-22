// ==================================================
// SISTEMA DE CONSULTA DE EDITAIS - Filtros e Tabela
// ==================================================

class SistemaConsultaEditais {
    constructor() {
        this.apiBase = window.location.origin;
        this.dadosAtuais = [];
        this.filtrosAtivos = {};
        this.paginacaoAtual = {
            pagina: 1,
            limite: 50,
            total: 0,
            totalPaginas: 0
        };
        
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando Sistema de Consulta de Editais...');
        
        // Carregar estatísticas
        await this.carregarEstatisticas();
        
        // Carregar opções dos filtros
        await this.carregarOpcoesFiltros();
        
        // Configurar eventos
        this.configurarEventos();
        
        // Carregar dados iniciais
        await this.carregarDados();
        
        console.log('✅ Sistema de Consulta inicializado com sucesso!');
    }

    // ==================================================
    // CARREGAMENTO DE DADOS
    // ==================================================

    async carregarEstatisticas() {
        try {
            const response = await fetch(`${this.apiBase}/api/estatisticas`);
            const data = await response.json();
            
            if (data.sucesso) {
                document.getElementById('totalEditais').textContent = 
                    data.estatisticas.totalEditais.toLocaleString('pt-BR');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar estatísticas:', error);
        }
    }

    async carregarOpcoesFiltros() {
        try {
            // Carregar dados para popular filtros
            const response = await fetch(`${this.apiBase}/api/editais?limite=1000`);
            const data = await response.json();
            
            if (data.sucesso) {
                this.popularFiltros(data.dados);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar opções dos filtros:', error);
        }
    }

    popularFiltros(dados) {
        // Modalidades
        const modalidades = [...new Set(dados.map(item => item.modalidade).filter(Boolean))];
        const selectModalidade = document.getElementById('modalidade');
        modalidades.forEach(modalidade => {
            const option = document.createElement('option');
            option.value = modalidade;
            option.textContent = modalidade;
            selectModalidade.appendChild(option);
        });

        // UFs
        const ufs = [...new Set(dados.map(item => item.uf).filter(Boolean))].sort();
        const selectUF = document.getElementById('uf');
        ufs.forEach(uf => {
            const option = document.createElement('option');
            option.value = uf;
            option.textContent = uf;
            selectUF.appendChild(option);
        });

        // Municípios
        const municipios = [...new Set(dados.map(item => item.municipio).filter(Boolean))].sort();
        const selectMunicipio = document.getElementById('municipio');
        municipios.forEach(municipio => {
            const option = document.createElement('option');
            option.value = municipio;
            option.textContent = municipio;
            selectMunicipio.appendChild(option);
        });

        // Órgãos
        const orgaos = [...new Set(dados.map(item => item.razao_social).filter(Boolean))].sort();
        const selectOrgao = document.getElementById('orgao');
        orgaos.forEach(orgao => {
            const option = document.createElement('option');
            option.value = orgao;
            option.textContent = orgao.length > 50 ? orgao.substring(0, 50) + '...' : orgao;
            selectOrgao.appendChild(option);
        });
    }

    async carregarDados() {
        this.mostrarLoading(true);
        
        try {
            const params = this.construirParametros();
            const response = await fetch(`${this.apiBase}/api/editais?${params}`);
            const data = await response.json();
            
            if (data.sucesso) {
                this.dadosAtuais = data.dados;
                this.paginacaoAtual = data.paginacao;
                this.renderizarTabela();
                this.renderizarPaginacao();
                this.mostrarTabela(true);
            } else {
                this.mostrarErro(data.mensagem);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            this.mostrarErro('Erro ao carregar dados: ' + error.message);
        } finally {
            this.mostrarLoading(false);
        }
    }

    // ==================================================
    // RENDERIZAÇÃO
    // ==================================================

    renderizarTabela() {
        const tbody = document.getElementById('tabelaBody');
        tbody.innerHTML = '';

        this.dadosAtuais.forEach(edital => {
            const row = this.criarLinhaTabela(edital);
            tbody.appendChild(row);
        });
    }

    criarLinhaTabela(edital) {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>
                <small class="text-muted">${edital.numero_controle_pncp}</small>
            </td>
            <td>
                <div class="fw-bold">${this.truncarTexto(edital.razao_social, 30)}</div>
                <small class="text-muted">${edital.cnpj_orgao}</small>
            </td>
            <td>
                <div>${edital.municipio || '-'}</div>
                <span class="badge bg-secondary">${edital.uf || '-'}</span>
            </td>
            <td>
                <div class="text-truncate" style="max-width: 200px;" title="${edital.objeto || '-'}">
                    ${edital.objeto || '-'}
                </div>
            </td>
            <td>
                <span class="badge bg-info">${edital.modalidade || '-'}</span>
            </td>
            <td>
                ${this.criarBadgeStatus(edital.situacao)}
            </td>
            <td>
                <div class="valor">${this.formatarValor(edital.valor_estimado)}</div>
            </td>
            <td>
                <div>${this.formatarData(edital.data_publicacao)}</div>
                <small class="text-muted">${this.formatarHora(edital.data_publicacao)}</small>
            </td>
            <td>
                <span class="badge bg-primary">${edital.total_itens || 0}</span>
            </td>
            <td>
                <span class="badge bg-warning">${edital.total_documentos || 0}</span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="sistemaConsulta.verDetalhes('${edital.numero_controle_pncp}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        
        return tr;
    }

    criarBadgeStatus(status) {
        const statusMap = {
            'Aberta': 'success',
            'Encerrada': 'danger',
            'Em Julgamento': 'warning',
            'Suspensa': 'secondary',
            'Cancelada': 'dark'
        };
        
        const classe = statusMap[status] || 'secondary';
        return `<span class="badge bg-${classe}">${status || '-'}</span>`;
    }

    renderizarPaginacao() {
        const paginacao = document.getElementById('paginacao');
        const info = document.getElementById('paginacaoInfo');
        
        // Informações
        const inicio = (this.paginacaoAtual.pagina - 1) * this.paginacaoAtual.limite + 1;
        const fim = Math.min(this.paginacaoAtual.pagina * this.paginacaoAtual.limite, this.paginacaoAtual.total);
        
        info.textContent = `Mostrando ${inicio} a ${fim} de ${this.paginacaoAtual.total.toLocaleString('pt-BR')} registros`;
        
        // Botões de paginação
        paginacao.innerHTML = '';
        
        // Botão anterior
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${this.paginacaoAtual.pagina === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `
            <a class="page-link" href="#" onclick="sistemaConsulta.irParaPagina(${this.paginacaoAtual.pagina - 1})">
                <i class="fas fa-chevron-left"></i>
            </a>
        `;
        paginacao.appendChild(prevLi);
        
        // Páginas
        const inicioPagina = Math.max(1, this.paginacaoAtual.pagina - 2);
        const fimPagina = Math.min(this.paginacaoAtual.totalPaginas, this.paginacaoAtual.pagina + 2);
        
        for (let i = inicioPagina; i <= fimPagina; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === this.paginacaoAtual.pagina ? 'active' : ''}`;
            li.innerHTML = `
                <a class="page-link" href="#" onclick="sistemaConsulta.irParaPagina(${i})">${i}</a>
            `;
            paginacao.appendChild(li);
        }
        
        // Botão próximo
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${this.paginacaoAtual.pagina === this.paginacaoAtual.totalPaginas ? 'disabled' : ''}`;
        nextLi.innerHTML = `
            <a class="page-link" href="#" onclick="sistemaConsulta.irParaPagina(${this.paginacaoAtual.pagina + 1})">
                <i class="fas fa-chevron-right"></i>
            </a>
        `;
        paginacao.appendChild(nextLi);
    }

    // ==================================================
    // EVENTOS E INTERAÇÕES
    // ==================================================

    configurarEventos() {
        // Botão pesquisar
        document.getElementById('pesquisar').addEventListener('click', () => {
            this.aplicarFiltros();
        });
        
        // Botão limpar
        document.getElementById('limparFiltros').addEventListener('click', () => {
            this.limparFiltros();
        });
        
        // Enter na busca
        document.getElementById('busca').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.aplicarFiltros();
            }
        });
        
        // Mudança nos selects
        ['modalidade', 'uf', 'municipio', 'orgao'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.aplicarFiltros();
            });
        });
        
        // Mudança nos radio buttons de status
        document.querySelectorAll('input[name="status"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.aplicarFiltros();
            });
        });
    }

    aplicarFiltros() {
        this.paginacaoAtual.pagina = 1; // Reset para primeira página
        this.carregarDados();
    }

    limparFiltros() {
        // Limpar inputs
        document.getElementById('busca').value = '';
        document.getElementById('dataInicio').value = '';
        document.getElementById('dataFim').value = '';
        document.getElementById('valorMin').value = '';
        document.getElementById('valorMax').value = '';
        
        // Limpar selects
        ['modalidade', 'uf', 'municipio', 'orgao'].forEach(id => {
            document.getElementById(id).value = '';
        });
        
        // Reset status
        document.getElementById('statusTodos').checked = true;
        
        this.aplicarFiltros();
    }

    irParaPagina(pagina) {
        if (pagina >= 1 && pagina <= this.paginacaoAtual.totalPaginas) {
            this.paginacaoAtual.pagina = pagina;
            this.carregarDados();
        }
    }

    async verDetalhes(numeroControle) {
        try {
            const response = await fetch(`${this.apiBase}/api/editais/${numeroControle}`);
            const data = await response.json();
            
            if (data.sucesso) {
                this.mostrarModalDetalhes(data.dados);
            } else {
                alert('Erro ao carregar detalhes: ' + data.mensagem);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar detalhes:', error);
            alert('Erro ao carregar detalhes: ' + error.message);
        }
    }

    mostrarModalDetalhes(edital) {
        const modalBody = document.getElementById('modalBody');
        
        modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="detail-section">
                        <div class="detail-label">Número de Controle PNCP</div>
                        <div class="detail-value">${edital.numero_controle_pncp}</div>
                    </div>
                    
                    <div class="detail-section">
                        <div class="detail-label">Órgão</div>
                        <div class="detail-value">${edital.razao_social}</div>
                        <small class="text-muted">CNPJ: ${edital.cnpj_orgao}</small>
                    </div>
                    
                    <div class="detail-section">
                        <div class="detail-label">Localização</div>
                        <div class="detail-value">${edital.municipio}, ${edital.uf}</div>
                    </div>
                    
                    <div class="detail-section">
                        <div class="detail-label">Processo</div>
                        <div class="detail-value">${edital.processo || '-'}</div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="detail-section">
                        <div class="detail-label">Modalidade</div>
                        <div class="detail-value">
                            <span class="badge bg-info">${edital.modalidade}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <div class="detail-label">Situação</div>
                        <div class="detail-value">
                            ${this.criarBadgeStatus(edital.situacao)}
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <div class="detail-label">Valor Estimado</div>
                        <div class="detail-value valor">${this.formatarValor(edital.valor_estimado)}</div>
                    </div>
                    
                    <div class="detail-section">
                        <div class="detail-label">Data de Publicação</div>
                        <div class="detail-value">${this.formatarDataCompleta(edital.data_publicacao)}</div>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <div class="detail-label">Objeto</div>
                <div class="detail-value">${edital.objeto || '-'}</div>
            </div>
            
            <div class="row">
                <div class="col-md-4">
                    <div class="stats-card">
                        <div class="stats-number">${edital.estatisticas.totalItens}</div>
                        <div class="stats-label">Total de Itens</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="stats-card">
                        <div class="stats-number">${edital.estatisticas.totalDocumentos}</div>
                        <div class="stats-label">Documentos</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="stats-card">
                        <div class="stats-number">${edital.estatisticas.totalEventos}</div>
                        <div class="stats-label">Eventos no Histórico</div>
                    </div>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-md-12">
                    <ul class="nav nav-tabs" id="detalhesTabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="itens-tab" data-bs-toggle="tab" data-bs-target="#itens" type="button" role="tab">
                                <i class="fas fa-list me-2"></i>Itens (${edital.estatisticas.totalItens})
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="documentos-tab" data-bs-toggle="tab" data-bs-target="#documentos" type="button" role="tab">
                                <i class="fas fa-file-alt me-2"></i>Documentos (${edital.estatisticas.totalDocumentos})
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="historico-tab" data-bs-toggle="tab" data-bs-target="#historico" type="button" role="tab">
                                <i class="fas fa-history me-2"></i>Histórico (${edital.estatisticas.totalEventos})
                            </button>
                        </li>
                    </ul>
                    
                    <div class="tab-content mt-3" id="detalhesTabsContent">
                        <div class="tab-pane fade show active" id="itens" role="tabpanel">
                            <div class="table-responsive">
                                <table class="table table-sm items-table">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Descrição</th>
                                            <th>Quantidade</th>
                                            <th>Valor Unit.</th>
                                            <th>Valor Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.renderizarItens(edital.itens)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div class="tab-pane fade" id="documentos" role="tabpanel">
                            <div class="table-responsive">
                                <table class="table table-sm documents-table">
                                    <thead>
                                        <tr>
                                            <th>Sequencial</th>
                                            <th>Título</th>
                                            <th>Tipo</th>
                                            <th>Data</th>
                                            <th>URL</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.renderizarDocumentos(edital.documentos)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div class="tab-pane fade" id="historico" role="tabpanel">
                            <div class="table-responsive">
                                <table class="table table-sm history-table">
                                    <thead>
                                        <tr>
                                            <th>Sequencial</th>
                                            <th>Título</th>
                                            <th>Descrição</th>
                                            <th>Data</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.renderizarHistorico(edital.historico)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('modalDetalhes'));
        modal.show();
    }

    renderizarItens(itens) {
        if (!itens || itens.length === 0) {
            return '<tr><td colspan="5" class="text-center text-muted">Nenhum item encontrado</td></tr>';
        }
        
        return itens.map(item => `
            <tr>
                <td>${item.numeroItem || '-'}</td>
                <td>${item.descricao || '-'}</td>
                <td>${item.quantidade || '-'}</td>
                <td>${this.formatarValor(item.valorUnitario)}</td>
                <td class="valor">${this.formatarValor(item.valorTotal)}</td>
            </tr>
        `).join('');
    }

    renderizarDocumentos(documentos) {
        if (!documentos || documentos.length === 0) {
            return '<tr><td colspan="5" class="text-center text-muted">Nenhum documento encontrado</td></tr>';
        }
        
        return documentos.map(doc => `
            <tr>
                <td>${doc.sequencial || '-'}</td>
                <td>${doc.titulo || '-'}</td>
                <td>${doc.tipoDocumentoNome || '-'}</td>
                <td>${this.formatarData(doc.dataPublicacao)}</td>
                <td>
                    ${doc.url ? `<a href="${doc.url}" target="_blank" class="btn btn-sm btn-outline-primary">
                        <i class="fas fa-external-link-alt"></i>
                    </a>` : '-'}
                </td>
            </tr>
        `).join('');
    }

    renderizarHistorico(historico) {
        if (!historico || historico.length === 0) {
            return '<tr><td colspan="4" class="text-center text-muted">Nenhum evento encontrado</td></tr>';
        }
        
        return historico.map(evento => `
            <tr>
                <td>${evento.sequencial || '-'}</td>
                <td>${evento.titulo || '-'}</td>
                <td>${evento.descricao || '-'}</td>
                <td>${this.formatarDataCompleta(evento.dataPublicacao)}</td>
            </tr>
        `).join('');
    }

    // ==================================================
    // UTILITÁRIOS
    // ==================================================

    construirParametros() {
        const params = new URLSearchParams();
        
        // Paginação
        params.append('pagina', this.paginacaoAtual.pagina);
        params.append('limite', this.paginacaoAtual.limite);
        
        // Filtros
        const busca = document.getElementById('busca').value.trim();
        if (busca) params.append('busca', busca);
        
        const modalidade = document.getElementById('modalidade').value;
        if (modalidade) params.append('modalidade', modalidade);
        
        const uf = document.getElementById('uf').value;
        if (uf) params.append('uf', uf);
        
        const municipio = document.getElementById('municipio').value;
        if (municipio) params.append('municipio', municipio);
        
        const orgao = document.getElementById('orgao').value;
        if (orgao) params.append('orgao', orgao);
        
        const dataInicio = document.getElementById('dataInicio').value;
        if (dataInicio) params.append('dataInicio', dataInicio);
        
        const dataFim = document.getElementById('dataFim').value;
        if (dataFim) params.append('dataFim', dataFim);
        
        const valorMin = document.getElementById('valorMin').value;
        if (valorMin) params.append('valorMin', valorMin);
        
        const valorMax = document.getElementById('valorMax').value;
        if (valorMax) params.append('valorMax', valorMax);
        
        const status = document.querySelector('input[name="status"]:checked').value;
        if (status) params.append('situacao', status);
        
        return params.toString();
    }

    mostrarLoading(mostrar) {
        document.getElementById('loading').style.display = mostrar ? 'block' : 'none';
        document.getElementById('tabelaContainer').style.display = mostrar ? 'none' : 'block';
    }

    mostrarTabela(mostrar) {
        document.getElementById('tabelaContainer').style.display = mostrar ? 'block' : 'none';
    }

    mostrarErro(mensagem) {
        const container = document.getElementById('tabelaContainer');
        container.innerHTML = `
            <div class="alert alert-danger m-3" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${mensagem}
            </div>
        `;
        container.style.display = 'block';
    }

    formatarValor(valor) {
        if (!valor || valor === 0) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    }

    formatarData(data) {
        if (!data) return '-';
        return new Date(data).toLocaleDateString('pt-BR');
    }

    formatarHora(data) {
        if (!data) return '-';
        return new Date(data).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatarDataCompleta(data) {
        if (!data) return '-';
        return new Date(data).toLocaleString('pt-BR');
    }

    truncarTexto(texto, limite) {
        if (!texto) return '-';
        return texto.length > limite ? texto.substring(0, limite) + '...' : texto;
    }
}

// ==================================================
// INICIALIZAÇÃO
// ==================================================

let sistemaConsulta;

document.addEventListener('DOMContentLoaded', () => {
    sistemaConsulta = new SistemaConsultaEditais();
    
    // Inicializar tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});
