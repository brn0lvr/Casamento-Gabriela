# Pré-confirmação | Gabriela & Mateus

Site estático independente para pré-confirmação de presença. Os arquivos `convidados.js`, `styles.css`, `Images/` e `Fonts/` foram copiados do projeto original para que a lista de famílias, recursos visuais e identidade permaneçam iguais sem dependência de caminhos externos ao repositório.

## Publicar no GitHub Pages

1. Crie um repositório separado no GitHub e envie o conteúdo desta pasta para a raiz dele.
2. Em **Settings > Pages**, selecione **Deploy from a branch**, a branch principal e a pasta `/ (root)`.
3. Aguarde a publicação e acesse a URL do GitHub Pages.

## Configurar o recebimento

O frontend envia `action=preconfirmation` à implantação própria do Apps Script. O arquivo `apps-script-rsvp.gs` desta pasta preserva as rotas existentes e acrescenta a gravação na guia `Pré-confirmações`, com os mesmos cabeçalhos da aba `Confirmacoes`.

O código já está publicado como uma nova implantação de aplicativo da web, executando como o proprietário e permitindo acesso público. Ela usa a mesma planilha vinculada, mas uma URL de implantação separada; não altere nem substitua a usada pelo site original. Somente pedidos com `action=preconfirmation` são direcionados à guia nova. O primeiro envio cria a guia e os cabeçalhos automaticamente. Também é possível chamar `?action=setup` nessa implantação para preparar as abas.

Não é necessário colocar credenciais no frontend. A URL pública da implantação identifica o endpoint, mas não concede acesso direto à planilha.

## Dados registrados

`familyId`, `familyName`, `confirmedMembers`, `absentMembers`, `totalConfirmed`, `phone`, `alcoholCount`, `dietaryRestriction`, `notes`, `confirmedAt` e `updatedAt`. O registro é atualizado por família, como no fluxo existente.

> A nova implantação usa o projeto Apps Script vinculado à planilha; mantenha a implantação existente e use esta URL apenas no site de pré-confirmação. As alterações do site podem ser publicadas separadamente neste repositório.