document.addEventListener('DOMContentLoaded', () => {
    const terminal = document.getElementById('terminal');
    const screen = document.querySelector('.screen');
    const inputBar = document.querySelector('.input-bar');
    const mobileInputArea = inputBar.querySelector('.input-area');
    const mobileBarLabel = inputBar.querySelector('.prompt-label');
    const mobileAboveLabel = document.querySelector('.mobile-prompt-label');
    const historyUpBtn = document.getElementById('history-up');
    const historyDownBtn = document.getElementById('history-down');

    const keySound = new Audio('sounds/mixkit-typewriter-soft-hit-1366.wav');
    const enterSound = new Audio('sounds/mixkit-hard-typewriter-click-1119.wav');

    let commandHistory = [];
    let historyIndex = 0;
    let isFormatting = false;
    let isMatrixRunning = false;
    let currentInputArea;
    let isMuted = false;

    const bootSequence = [
        { text: "Booting Capsys OS v4.0 (Consulta Mode)...", class: 'text-info' },
        { text: "Loading API modules... [OK]", class: 'text-success' },
        { text: " ", delay: 100 },
        { text: "Terminal de Consulta de CNPJ pronto.", class: 'text-info' },
        { text: " ", delay: 100 },
        { text: `Data: ${new Date().toString()}`, class: 'text-comment' },
        { text: " ", delay: 100 }
    ];

    function start() {
        terminal.innerHTML = '';
        runBootSequence(bootSequence, () => {
            createPrompt('Digite o CNPJ para consulta:');
        });
    }

    function runBootSequence(sequence, finalCallback) {
        let index = 0;
        const nextLine = () => {
            if (index < sequence.length) {
                const item = sequence[index++];
                setTimeout(() => addLine(item.text, item.class, nextLine), item.delay || 50);
            } else if (finalCallback) {
                finalCallback();
            }
        };
        nextLine();
    }
    
    function skipBootSequence() {
        terminal.innerHTML = '';
        bootSequence.forEach(line => addLine(line.text, line.class));
        createPrompt('Digite o CNPJ para consulta:');
    }

    function createPrompt(label) {
        const oldDesktopPrompt = terminal.querySelector('.prompt.desktop-only');
        if (oldDesktopPrompt) oldDesktopPrompt.remove();
        
        const desktopPromptWrapper = document.createElement('div');
        desktopPromptWrapper.className = 'line prompt desktop-only';
        desktopPromptWrapper.innerHTML = `<span>${label}&nbsp;</span><span class="input-area" contenteditable="true"></span><span class="cursor"></span>`;
        terminal.appendChild(desktopPromptWrapper);
        const desktopInputArea = desktopPromptWrapper.querySelector('.input-area');
        
        mobileAboveLabel.textContent = label;
        mobileBarLabel.innerHTML = `>&nbsp;`;
        
        currentInputArea = window.innerWidth <= 768 ? mobileInputArea : desktopInputArea;
        
        [desktopInputArea, mobileInputArea].forEach(input => {
            input.removeEventListener('keydown', handleKeyDown);
            input.removeEventListener('input', handleInput);
            input.addEventListener('keydown', handleKeyDown);
            input.addEventListener('input', handleInput);
        });
        
        focusAndMoveCursorToEnd(currentInputArea);
        terminal.scrollTop = terminal.scrollHeight;
    }

    function navigateHistory(direction) {
        if (direction === 'up' && historyIndex > 0) {
            historyIndex--;
        } else if (direction === 'down') {
            if (historyIndex < commandHistory.length) {
                historyIndex++;
            } else { return; }
        } else { return; }
        
        currentInputArea.innerText = commandHistory[historyIndex] || '';
        focusAndMoveCursorToEnd(currentInputArea);
    }
    
    historyUpBtn.addEventListener('click', () => navigateHistory('up'));
    historyDownBtn.addEventListener('click', () => navigateHistory('down'));

    function handleInput(e) {
        if (isFormatting) return;
        const inputArea = e.target;
        const rawText = inputArea.innerText;
        
        if (/[^0-9.\/-]/.test(rawText)) {
            isFormatting = true;
            inputArea.innerText = rawText.replace(/[.\/-]/g, '');
            isFormatting = false;
            focusAndMoveCursorToEnd(inputArea);
            return;
        }
        
        const digitsOnly = rawText.replace(/\D/g, '');
        isFormatting = true;
        const formatted = formatCnpj(digitsOnly);
        inputArea.innerText = formatted;
        isFormatting = false;
        focusAndMoveCursorToEnd(inputArea);
    }

    function formatCnpj(value) {
        value = (value || "").replace(/\D/g, '').substring(0, 14);
        if (value.length <= 2) return value;
        if (value.length <= 5) return value.replace(/(\d{2})(\d+)/, '$1.$2');
        if (value.length <= 8) return value.replace(/(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
        if (value.length <= 12) return value.replace(/(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
        return value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
    }

    function handleKeyDown(e) {
        switch(e.key) {
            case 'Enter':
                e.preventDefault();
                if (!isMuted) {
                    enterSound.currentTime = 0;
                    enterSound.play();
                }
                
                const command = currentInputArea.innerText.trim();
                const currentPrompt = terminal.querySelector('.prompt');
                if (currentPrompt) {
                    const label = currentPrompt.querySelector('span:first-child').innerText;
                    currentPrompt.innerHTML = `<span>${label}</span>${command}`;
                    currentPrompt.classList.remove('prompt', 'desktop-only');
                } else if(window.innerWidth <= 768){
                    addLine(`>&nbsp;${command}`);
                }
                
                if (command) {
                    if (command !== commandHistory[commandHistory.length - 1]) {
                        commandHistory.push(command);
                    }
                    historyIndex = commandHistory.length;
                    processInput(command);
                } else {
                    createPrompt('Digite o CNPJ para consulta:');
                }
                currentInputArea.innerText = '';
                break;

            case 'ArrowUp': e.preventDefault(); navigateHistory('up'); break;
            case 'ArrowDown': e.preventDefault(); navigateHistory('down'); break;
            default:
                if (!isMuted && (e.key.length === 1 || e.key === 'Backspace')) {
                    keySound.currentTime = 0;
                    keySound.play();
                }
                break;
        }
    }
    
    function processInput(input) {
        if (/[^0-9.\/-]/.test(input)) {
            executeEasterEgg(input.toLowerCase());
        } else {
            const cleanedInput = input.replace(/\D/g, '');
            if (cleanedInput.length !== 14) {
                displayError("CNPJ deve ter 14 dígitos.");
                return createPrompt('Digite outro CNPJ ou CTRL+R para reiniciar:');
            }
            if (!validateCnpj(cleanedInput)) {
                displayError("CNPJ inválido (dígitos verificadores não conferem).");
                return createPrompt('Digite outro CNPJ ou CTRL+R para reiniciar:');
            }
            fetchCnpjData(cleanedInput);
        }
    }

    function executeEasterEgg(command) {
        const parts = command.split(' ');
        const baseCommand = parts[0];
        switch(baseCommand) {
            case 'sound':
                isMuted = !isMuted;
                addLine(isMuted ? "Sons desabilitados." : "Sons habilitados.", 'text-comment');
                break;
            case 'help':
                addLine('Comandos disponíveis:', 'text-info');
                addLine('- clear, ls, whoami, date, help, capsys, matrix, startx, sound', 'text-comment');
                addLine('- start [jogo]: Inicia um jogo (ex: start duke nukem)', 'text-comment');
                break;
            case 'ls':
                addLine("drwxr-xr-x 2 capsys staff 64B Oct 7 16:38 <span class='text-info'>jogos/</span>");
                addLine("-rw-r--r-- 1 capsys staff 1.2K Oct 7 09:15 README.md");
                break;
            case 'clear': terminal.innerHTML = ''; break;
            case 'date': addLine(new Date().toString(), 'text-comment'); break;
            case 'whoami': addLine('guest', 'text-info'); break;
            case 'capsys':
    const logo = [
        "    _____           _____                 ",
        "   / ____|         / ____|                ",
        "  | |   | __ _ _ __ | (___   ",
        "  | |  / _` | '_ \\ \\___ \\",
        "  | |___| (_| | |_) |____) | ",
        "   \\_____\\__,_| .__/|_____/ ",
        "               | |                      ",
        "               |_|                      ",
    ];            logo.forEach(line => addLine(line));
                addLine("Visite nosso site: https://capsys.com.br", 'text-info');
                setTimeout(() => window.open('https://capsys.com.br', '_blank'), 500);
                break;
            case 'matrix': startMatrix(); break;
            case 'cd':
                const cdname = parts.slice(1).join(' ');
                addLine(cdname.includes('jogos') ? "Conteúdo de jogos/: doom, duke nukem" : `bash: diretório '${cdname}' não encontrado.`, cdname.includes('jogos') ? 'text-info' : 'text-error');
                break;
            case 'start':
                const gameName = parts.slice(1).join(' ');
                if (gameName.includes('duke nukem')) {
                     addLine("Iniciando Duke Nukem 3D...", 'text-info');
                     window.open('duke.html', '_blank');
                } else { addLine(`Jogo '${gameName}' não encontrado.`, 'text-error'); }
                break;
            case 'startx':
                addLine("Iniciando interface gráfica...", 'text-info');
                window.open('../With-Desktop/loginv3.html', '_blank');
                break;
            default:
                addLine(`bash: comando não encontrado: ${command}`, 'text-error');
                break;
        }
        if (!isMatrixRunning) {
            createPrompt('Digite o CNPJ para consulta:');
        }
    }
    
    function validateCnpj(cnpj) {
        cnpj = cnpj.replace(/[^\d]+/g,'');
        if(cnpj === '' || cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
        let tamanho = 12, numeros = cnpj.substring(0,tamanho), digitos = cnpj.substring(12), soma = 0, pos = 5;
        for (let i = tamanho; i >= 1; i--) { soma += parseInt(numeros.charAt(tamanho - i)) * pos--; if (pos < 2) pos = 9; }
        let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
        if (resultado !== parseInt(digitos.charAt(0))) return false;
        tamanho = 13; numeros = cnpj.substring(0,tamanho); soma = 0; pos = 6;
        for (let i = tamanho; i >= 1; i--) { soma += parseInt(numeros.charAt(tamanho - i)) * pos--; if (pos < 2) pos = 9; }
        resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
        if (resultado !== parseInt(digitos.charAt(1))) return false;
        return true;
    }

    async function fetchCnpjData(cnpj) {
        addLine('Consultando CNPJ...', 'text-comment');
        
        // Simulação da resposta da requisição com o JSON fornecido
        const simulatedApiResponse = {
            "success": true,
            "message": null,
            "data": {
                "cnpj": "00000000000191",
                "situacaoCadastral": "Ativa",
                "dataSituacaoCadastral": "03/11/2005",
                "motivoSituacaoCadastral": "SEM MOTIVO",
                "razaoSocial": "BANCO DO BRASIL SA",
                "nomeFantasia": "DIRECAO GERAL",
                "dataInicioAtividades": "01/08/1966",
                "matriz": "Sim",
                "naturezaJuridica": "Sociedade de Economia Mista (2038)",
                "capitalSocial": 120000000000,
                "email": "SECEX@BB.COM.BR",
                "telefone": "(61) 34939002",
                "logradouro": "QUADRA SAUN QUADRA 5 BLOCO B TORRE I, II, III",
                "numero": "SN",
                "complemento": "ANDAR T I SL S101 A S1602 T II SL C101 A C1602 TIII SL N101 A N1602",
                "bairro": "ASA NORTE",
                "municipio": "BRASILIA",
                "uf": "DF",
                "cep": "70040-912",
                "dataSituacaoEspecial": null,
                "situacaoEspecial": null,
                "opcaoSimples": "N",
                "opcaoMei": "N",
                "cnaes": [
                    {
                        "cnae": "6422100",
                        "descricao": "Bancos múltiplos, com carteira comercial"
                    },
                    {
                        "cnae": "6499999",
                        "descricao": "Outras atividades de serviços financeiros não especificadas anteriormente"
                    }
                ],
                "socios": [
                    {
                        "nomeSocio": "EDUARDO CESAR PASA",
                        "descricao": "Diretor",
                        "identificadorSocio": 2,
                        "cnpjCpfSocio": "***035920**",
                        "dataEntradaSociedade": "30/06/2015",
                        "nomeRepresentante": null,
                        "faixaEtaria": "51-60 anos"
                    },
                    {
                        "nomeSocio": "LUCINEIA POSSAR",
                        "descricao": "Diretor",
                        "identificadorSocio": 2,
                        "cnpjCpfSocio": "***309199**",
                        "dataEntradaSociedade": "28/11/2017",
                        "nomeRepresentante": null,
                        "faixaEtaria": "51-60 anos"
                    },
                    {
                        "nomeSocio": "FELIPE GUIMARAES GEISSLER PRINCE",
                        "descricao": "Diretor",
                        "identificadorSocio": 2,
                        "cnpjCpfSocio": "***345856**",
                        "dataEntradaSociedade": "10/07/2020",
                        "nomeRepresentante": null,
                        "faixaEtaria": "41-50 anos"
                    },
                    // ... (demais sócios)
                ]
            }
        };

        try {
            // MOCK: Usando a resposta simulada em vez do fetch real
            // Se quiser reativar o fetch real, remova a linha abaixo.
           // const data = simulatedApiResponse; 
            
           
            // DESCOMENTE PARA O FETCH REAL:
            const response = await fetch(`https://kitana.opencnpj.com/cnpj/${cnpj}`);
            if (!response.ok) throw new Error(`API indisponível (status: ${response.status})`);
            const data = await response.json();
           

            if (!data.success || !data.data) {
                throw new Error(data.message || "CNPJ não encontrado ou erro na resposta da API.");
            }
            
            displayDataAsTable(data.data);
        } catch (error) {
            displayError(error.message);
        } finally {
            createPrompt('Digite outro CNPJ ou CTRL+R para reiniciar:');
        }
    }

    function displayDataAsTable(cnpjData) {
        const d = cnpjData;
        const keyWidth = 25; 
        const contentWidth = 70;
        const valueWidth = contentWidth - keyWidth - 7;
        const border = `+${'-'.repeat(contentWidth)}+`;
        let textToCopy = '*** Dados da Empresa ***\n\n';

        // --- Funções Auxiliares ---
        const formatCurrency = (value) => {
            const num = parseFloat(value);
            return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        };
        const formatYesNo = (value) => value === 'S' || value === 'Sim' ? 'SIM' : 'NÃO';

        // --- Dados Principais ---
        const formattedData = {
            "CNPJ": d.cnpj ? formatCnpj(d.cnpj) : "N/A",
            "Razão Social": d.razaoSocial,
            "Nome Fantasia": d.nomeFantasia || "N/A",
            "Situação Cadastral": d.situacaoCadastral,
            "Data Situação": d.dataSituacaoCadastral,
            "Data Início Atividades": d.dataInicioAtividades,
            "Natureza Jurídica": d.naturezaJuridica,
            "Capital Social": formatCurrency(d.capitalSocial),
            "Opção Simples": formatYesNo(d.opcaoSimples), // NOVO
            "Opção MEI": formatYesNo(d.opcaoMei), // NOVO
            "Email": d.email || "N/A",
            "Telefone": d.telefone || "N/A",
            "Logradouro": d.logradouro,
            "Número": d.numero,
            "Complemento": d.complemento || "N/A",
            "Bairro": d.bairro,
            "Município / UF": `${d.municipio} - ${d.uf}`,
            "CEP": d.cep
        };
        
        // --- Geração da Saída no Terminal (Tabela/Lista) ---
        addLine(' ', 'text-success');
        addLine('--- DADOS CADASTRAIS (Receita Federal) ---', 'text-info');
        
        if (window.innerWidth <= 768) {
            for (const key in formattedData) {
                const value = formattedData[key] || "N/A";
                addLine(`${key}: ${value}`, 'text-info');
                textToCopy += `${key}: ${value}\n`;
            }
        } else {
            addLine(border, 'text-success');
            for (const key in formattedData) {
                const value = formattedData[key] || "N/A";
                const displayValue = value.toString().substring(0, valueWidth);
                const line = `| ${key.padEnd(keyWidth)}: ${displayValue.padEnd(valueWidth)}|`;
                addLine(line, 'text-success');
                textToCopy += `${key}: ${value}\n`;
            }
            addLine(border, 'text-success');
        }

        // --- NOVO: Exibição e Cópia dos CNAEs ---
        if (d.cnaes && d.cnaes.length > 0) {
            
            // Adiciona a quebra de linha para a cópia de texto
            textToCopy += '\n*** Atividades Econômicas (CNAEs) ***\n'; 
            
            // Inicia a seção no terminal
            addLine(' ', 'text-info');
            addLine('--- ATIVIDADES ECONÔMICAS (CNAEs) ---', 'text-info');

            // Formata o CNAE principal
            const cnaePrincipal = d.cnaes[0];
            let cnaeLine = `PRINCIPAL: ${cnaePrincipal.cnae} - ${cnaePrincipal.descricao}`;
            addLine(cnaeLine, 'text-success');
            textToCopy += cnaeLine + '\n';
            
            // Formata os CNAEs secundários (se existirem)
            const cnaesSecundarios = d.cnaes.slice(1);
            if (cnaesSecundarios.length > 0) {
                addLine('SECUNDÁRIAS:', 'text-comment');
                textToCopy += 'SECUNDÁRIAS:\n';
                cnaesSecundarios.forEach(cnae => {
                    cnaeLine = `- ${cnae.cnae} - ${cnae.descricao}`;
                    addLine(cnaeLine, 'text-success');
                    textToCopy += cnaeLine + '\n';
                });
            }
        }

        // --- NOVO: Exibição e Cópia dos Sócios ---
        if (d.socios && d.socios.length > 0) {
            const maxSociosDisplay = 5; // Reduzido para 5 para manter a tela limpa
            
            // Adiciona a quebra de linha para a cópia de texto
            textToCopy += `\n*** Quadro de Sócios e Administradores (${d.socios.length} no total) ***\n`; 

            // Inicia a seção no terminal
            addLine(' ', 'text-info');
            addLine(`--- QUADRO DE SÓCIOS E ADMINISTRADORES (Exibindo ${Math.min(maxSociosDisplay, d.socios.length)}) ---`, 'text-info');

            // Exibe um número limitado de sócios no terminal
            const sociosParaMostrar = d.socios.slice(0, maxSociosDisplay);
            sociosParaMostrar.forEach(socio => {
                const socioLine = `> ${socio.nomeSocio} (${socio.faixaEtaria || 'N/A'}) - ${socio.descricao} (Desde: ${socio.dataEntradaSociedade})`;
                addLine(socioLine, 'text-success');
            });

            if (d.socios.length > maxSociosDisplay) {
                const remaining = d.socios.length - maxSociosDisplay;
                addLine(`... e mais ${remaining} sócios/administradores (Apenas na cópia).`, 'text-comment');
            }

            // **IMPORTANTE**: Adiciona TODOS os sócios à área de cópia de texto
            d.socios.forEach(socio => {
                const socioCopyLine = `> ${socio.nomeSocio} (CPF/CNPJ: ${socio.cnpjCpfSocio}) - ${socio.descricao} (Desde: ${socio.dataEntradaSociedade} / Faixa Etária: ${socio.faixaEtaria || 'N/A'})`;
                textToCopy += socioCopyLine + '\n';
            });
        }


        // --- Botão de Copiar ---
        addLine(' ', 'text-success');
        const buttonWrapper = document.createElement('div');
        const copyButton = document.createElement('button');
        copyButton.innerText = '[ Copiar Resultado ]';
        copyButton.className = 'copy-button';

        copyButton.addEventListener('click', () => {
            // Certifica-se de que a cópia contém *tudo*
            navigator.clipboard.writeText(textToCopy.trim())
                .then(() => {
                    copyButton.innerText = 'Copiado para a área de transferência!';
                    setTimeout(() => {
                        copyButton.innerText = '[ Copiar Resultado ]';
                    }, 2500);
                })
                .catch(err => {
                    console.error('Falha ao copiar o texto: ', err);
                    copyButton.innerText = 'Erro ao copiar!';
                });
        });

        buttonWrapper.appendChild(copyButton);
        terminal.appendChild(buttonWrapper);
        
        addLine(' ', 'text-success');
    }

    function displayError(message) {
        const contentWidth = 70;
        const border = `+${'-'.repeat(contentWidth)}+`;
        addLine(' ', 'text-error');
        addLine(border, 'text-error');
        addLine(`| ERRO: ${message.padEnd(contentWidth - 8)}|`, 'text-error');
        addLine(border, 'text-error');
        addLine(' ', 'text-error');
    }

    function addLine(text, className, callback) {
        const line = document.createElement('div');
        if (className) line.className = `line ${className}`;
        line.innerHTML = text.replace(/ /g, '&nbsp;');
        terminal.appendChild(line);
        terminal.scrollTop = terminal.scrollHeight;
        if (callback) callback();
    }

    function focusAndMoveCursorToEnd(el) {
        if (!el) return;
        el.focus();
        if (typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }

    function startMatrix() {
        if (isMatrixRunning) return;
        isMatrixRunning = true;

        const canvas = document.getElementById('matrix-canvas');
        const ctx = canvas.getContext('2d');
        canvas.style.display = 'block';

        const setCanvasSize = () => {
            canvas.width = screen.clientWidth;
            canvas.height = screen.clientHeight;
        };
        setCanvasSize();
        window.addEventListener('resize', setCanvasSize);

        const originalTerminalContent = terminal.innerHTML;
        terminal.innerHTML = '';
        const stopMessage = document.createElement('div');
        stopMessage.innerHTML = "Pressione qualquer tecla para sair do modo Matrix...";
        stopMessage.className = 'text-info';
        stopMessage.style.textAlign = 'center';
        stopMessage.style.paddingTop = '40%';
        terminal.appendChild(stopMessage);

        const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
        const alphabet = katakana + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const fontSize = 16;
        const columns = canvas.width / fontSize;
        const rainDrops = Array.from({ length: columns }).map(() => 1);

        const draw = () => {
            ctx.fillStyle = 'rgba(8, 20, 8, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#45ff45';
            ctx.font = fontSize + 'px monospace';

            rainDrops.forEach((y, ind) => {
                const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
                const x = ind * fontSize;
                ctx.fillText(text, x, y * fontSize);
                if (y * fontSize > canvas.height && Math.random() > 0.975) {
                    rainDrops[ind] = 0;
                }
                rainDrops[ind]++;
            });
        };

        matrixInterval = setInterval(draw, 33);

        const stopMatrix = (e) => {
            e.preventDefault();
            clearInterval(matrixInterval);
            isMatrixRunning = false;
            canvas.style.display = 'none';
            window.removeEventListener('resize', setCanvasSize);
            document.removeEventListener('keydown', stopMatrix, true);
            terminal.innerHTML = originalTerminalContent;
            createPrompt('Digite o CNPJ para consulta:');
        };

        document.addEventListener('keydown', stopMatrix, { capture: true, once: true });
    }

 screen.addEventListener('click', (e) => {
        if (!inputBar.contains(e.target)) focusAndMoveCursorToEnd(currentInputArea);
    });

    document.addEventListener('keydown', (e) => {
        if (isBooting && e.key === 'Enter') {
            skipBootSequence();
        }
    });
 window.addEventListener('resize', () => {
        currentInputArea = window.innerWidth <= 768 ? mobileInputArea : terminal.querySelector('.prompt.desktop-only .input-area');
    });
    start();
});