if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
}

window.scrollTo(0, 0);
window.addEventListener("load", () => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));

const weddingIntro = document.getElementById("wedding-intro");
const invitationStage = weddingIntro?.querySelector(".invitation-stage");
let weddingIntroOpened = false;

if (weddingIntro) {
    document.body.style.overflow = "hidden";
}

function openWeddingIntro() {
    if (!weddingIntro || weddingIntroOpened) {
        return;
    }

    weddingIntroOpened = true;
    weddingIntro.classList.add("is-opening");
    window.setTimeout(() => {
        weddingIntro.classList.add("is-hidden");
        weddingIntro.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        document.getElementById("inicio")?.focus({ preventScroll: true });
    }, 4900);
    window.setTimeout(() => weddingIntro.remove(), 5200);
}

invitationStage?.addEventListener("click", openWeddingIntro);

const eventDate = new Date("2026-12-12T00:00:00-03:00").getTime();

function updateCountdown() {
    const diff = Math.max(eventDate - Date.now(), 0);
    const dayMs = 1000 * 60 * 60 * 24;
    const hourMs = 1000 * 60 * 60;
    const minuteMs = 1000 * 60;

    document.getElementById("days").textContent = String(Math.floor(diff / dayMs));
    document.getElementById("hours").textContent = String(Math.floor((diff % dayMs) / hourMs));
    document.getElementById("minutes").textContent = String(Math.floor((diff % hourMs) / minuteMs));
    document.getElementById("seconds").textContent = String(Math.floor((diff % minuteMs) / 1000));
}

updateCountdown();
window.setInterval(updateCountdown, 1000);

const rsvpForm = document.getElementById("rsvp-form");
const formStatus = document.getElementById("form-status");
const guestSearch = document.getElementById("guest-search");
const guestSearchResults = document.getElementById("guest-search-results");
const familyConfirmation = document.getElementById("family-confirmation");
const familyTitle = document.getElementById("family-title");
const familyCount = document.getElementById("family-count");
const familyMembers = document.getElementById("family-members");
const guestFamilies = Array.isArray(window.WEDDING_GUESTS) ? window.WEDDING_GUESTS : [];
const submitButton = rsvpForm?.querySelector(".btn-primary");
const rsvpTrackingConfig = {
    appsScriptUrl: "https://script.google.com/macros/s/AKfycbwoIlfcJ6JGWlWEEH_NK0ZdSarETwX62ISaDnEEbUAdiHufLPUKd0x7a49q-YrWCchE/exec"
};

let selectedFamily = null;

function normalizeSearchText(value) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function fixTextEncoding(value) {
    try {
        return decodeURIComponent(escape(value));
    } catch {
        return value;
    }
}

function getFamilySearchText(family) {
    return normalizeSearchText([
        fixTextEncoding(family.familyName),
        ...(family.searchNames || []).map((name) => fixTextEncoding(name)),
        ...family.members.map((member) => fixTextEncoding(member.name))
    ].join(" "));
}

function getFamilyMemberNames(family) {
    return family.members.map((member) => fixTextEncoding(member.name));
}

function renderGuestResults(query) {
    guestSearchResults.innerHTML = "";

    if (!query) {
        guestSearchResults.innerHTML = '<div class="guest-search-empty">Digite o nome de alguém da família para localizar a confirmação.</div>';
        formStatus.textContent = "";
        return;
    }

    if (!guestFamilies.length) {
        guestSearchResults.innerHTML = '<div class="guest-search-empty">A lista de convidados ainda não foi cadastrada.</div>';
        formStatus.textContent = "A lista de convidados ainda não foi cadastrada.";
        return;
    }

    const normalizedQuery = normalizeSearchText(query);
    const matches = guestFamilies
        .filter((family) => getFamilySearchText(family).includes(normalizedQuery))
        .slice(0, 8);

    if (!matches.length) {
        guestSearchResults.innerHTML = '<div class="guest-search-empty">Nenhum nome encontrado. Tente outro nome ou sobrenome.</div>';
        formStatus.textContent = "Nenhum nome encontrado na lista.";
        return;
    }

    formStatus.textContent = "";
    matches.forEach((family) => {
        const button = document.createElement("button");
        const memberNames = getFamilyMemberNames(family);
        button.type = "button";
        button.className = "guest-result-button";
        const personLabel = memberNames.length === 1 ? "pessoa" : "pessoas";
        button.innerHTML = `
            <span>
                <span class="guest-result-name">${fixTextEncoding(family.familyName)}</span>
                <span class="guest-result-members">${memberNames.join(", ")}</span>
            </span>
            <span class="guest-result-count">${memberNames.length} ${personLabel}</span>
        `;
        button.addEventListener("click", () => selectFamily(family));
        guestSearchResults.appendChild(button);
    });
}

function selectFamily(family) {
    selectedFamily = family;
    guestSearch.value = fixTextEncoding(family.familyName);
    guestSearchResults.innerHTML = "";
    formStatus.textContent = "";
    formStatus.className = "form-status";
    familyTitle.textContent = fixTextEncoding(family.familyName);
    const personLabel = family.members.length === 1 ? "pessoa" : "pessoas";
    familyCount.textContent = `${family.members.length} ${personLabel} na família`;
    familyMembers.innerHTML = "";

    family.members.forEach((member) => {
        const label = document.createElement("label");
        label.className = "family-member-option";
        label.innerHTML = `
            <input type="checkbox" name="confirmed_member" value="${member.id}" checked />
            <span class="family-member-name">${fixTextEncoding(member.name)}</span>
        `;
        familyMembers.appendChild(label);
    });

    familyConfirmation.hidden = false;
    familyConfirmation.classList.remove("is-visible");
    void familyConfirmation.offsetWidth;
    familyConfirmation.classList.add("is-visible");
    familyConfirmation.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buildPreconfirmationRecord() {
    const checkedIds = Array.from(
        familyMembers.querySelectorAll('input[name="confirmed_member"]:checked')
    ).map((input) => input.value);
    const confirmedMembers = selectedFamily.members
        .filter((member) => checkedIds.includes(member.id))
        .map((member) => fixTextEncoding(member.name));
    const absentMembers = selectedFamily.members
        .filter((member) => !checkedIds.includes(member.id))
        .map((member) => fixTextEncoding(member.name));
    const timestamp = new Date().toISOString();

    return {
        action: "preconfirmation",
        familyId: selectedFamily.id,
        familyName: fixTextEncoding(selectedFamily.familyName),
        confirmedMembers,
        absentMembers,
        totalConfirmed: confirmedMembers.length,
        phone: document.getElementById("telefone").value.trim(),
        alcoholCount: document.getElementById("alcool").value.trim(),
        dietaryRestriction: document.getElementById("restricao-alimentar").value.trim(),
        notes: document.getElementById("observacoes").value.trim(),
        confirmedAt: timestamp,
        updatedAt: timestamp
    };
}

async function sendPreconfirmation(record) {
    if (!rsvpTrackingConfig.appsScriptUrl) {
        throw new Error("Configure uma implantação própria do Apps Script antes de receber respostas.");
    }

    const payload = new URLSearchParams();
    Object.entries(record).forEach(([key, value]) => {
        payload.append(key, Array.isArray(value) ? value.join(", ") : value);
    });

    await fetch(rsvpTrackingConfig.appsScriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: payload.toString()
    });
}

function resetRsvpFlow() {
    rsvpForm.reset();
    selectedFamily = null;
    familyConfirmation.hidden = true;
    familyConfirmation.classList.remove("is-visible");
    familyMembers.innerHTML = "";
    guestSearchResults.innerHTML = "";
    if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Enviar pré-confirmação";
    }
}

function setSubmitState(isLoading) {
    if (!submitButton) {
        return;
    }

    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? "Enviando..." : "Enviar pré-confirmação";
}

guestSearch.addEventListener("input", () => {
    selectedFamily = null;
    familyConfirmation.hidden = true;
    renderGuestResults(guestSearch.value);
});

rsvpForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!selectedFamily) {
        formStatus.textContent = "Selecione seu nome na lista para continuar.";
        return;
    }

    const record = buildPreconfirmationRecord();
    if (!record.confirmedMembers.length && !record.absentMembers.length) {
        formStatus.textContent = "Selecione ao menos uma pessoa da família.";
        return;
    }

    formStatus.className = "form-status";
    setSubmitState(true);
    formStatus.textContent = "Enviando pré-confirmação...";
    try {
        await sendPreconfirmation(record);
        resetRsvpFlow();
        formStatus.className = "form-status is-success";
        formStatus.textContent = "Pré-confirmação registrada. Agradecemos! Ela não substitui a confirmação definitiva.";
    } catch (error) {
        setSubmitState(false);
        if (error.message.startsWith("Configure uma implantação")) {
            formStatus.className = "form-status is-error";
            formStatus.textContent = "Este formulário ainda não está configurado para receber respostas.";
            return;
        }

        formStatus.className = "form-status is-error";
        formStatus.textContent = "Não foi possível enviar agora. Verifique sua conexão e tente novamente.";
    }
});