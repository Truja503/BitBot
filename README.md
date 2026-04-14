# ₿ BitBot — Aprender Bitcoin nunca fue tan fácil

> **Proyecto CUBO+** · El Salvador 🇸🇻

---

## ¿Qué es BitBot?

BitBot es una plataforma educativa gamificada estilo Duolingo para aprender Bitcoin desde cero. Con un robot dorado como guía, el usuario avanza por niveles, gana Satoshis Virtuales y aprende los fundamentos reales de Bitcoin de forma interactiva.

---

## Equipo y Roles

### 1. 🎮 Desarrollo Frontend y Gamificación — Victor *(Programación Web)*

Encargado de que la web se vea y sienta como un juego.

- **Ruta de Niveles:** Mapa visual tipo Duolingo con nodos interconectados.
- **Lógica de Vidas y Satoshis:** Contador de 5 vidas y billetera de "Satoshis Virtuales".
- **Feedback del Robot:** Componente donde el robot cambia de imagen (`Triste.png`, `Feliz.png`, `Enojado.png`) según la respuesta del usuario.
- **Perfil del Jugador:** Vista con nombre, nivel alcanzado y racha actual.

---

### 2. 🎬 Contenido y Video IA — Oscar Garcia *(Producción Multimedia)*

El guionista y director de arte del proyecto.

- **Guiones de Clases:** Textos de cada lección basados en fuentes reales (*The Bitcoin Standard*, *Mastering Bitcoin*, *Inventing Bitcoin*).
- **Generación de Videos:** Herramientas de IA (HeyGen / D-ID) para animar el robot dorado como explicador de clase.
- **Caja de Preguntas IA:** Configuración de API (OpenAI o modelo local) restringida para responder **solo sobre Bitcoin** — sin shitcoins.

---

### 3. 🔧 Taller Práctico y Simulaciones — Rodrigo Trujillo *(UX/UI Especializada)*

La parte más técnica del MVP.

- **Simulador de Transacciones:** Interfaz donde el usuario "escanea" un QR falso y confirma una transacción Lightning.
- **Simulador de Nodo:** Minijuego visual de "conectar cables" o "descargar el software" para entender qué hace un nodo sin hacerlo de verdad.
- **Práctica de Semillas:** Juego de ordenar las 12/24 palabras de una frase semilla en el orden correcto.

---

### 4. 💼 Estrategia de Negocio y Estética — Ingrid *(Presentación)*

- **Freemium vs. Premium:**

| Plan | Incluye |
|------|---------|
| 🆓 Gratis | 5 vidas, anuncios, niveles básicos |
| ⭐ Premium | Vidas infinitas, sin anuncios, certificados, soporte IA ilimitado |

- **Plan de Negocios:** Modelo de monetización y escalabilidad.
- **Diseño de Activos:** Versiones del robot para cada estado de ánimo. Paleta coherente: Naranjas, dorados y azul oscuro *tech*.

---

## Stack Técnico

- **Backend:** Python · Django
- **Frontend:** HTML5 · CSS3 (variables personalizadas) · JavaScript
- **IA:** OpenAI API (restringida a contenido Bitcoin)
- **Animación:** HeyGen / D-ID para el robot dorado

---

## Paleta de Colores

```css
--bg:            #0A0911  /* Fondo principal */
--accent-violet: #6E5BFF  /* Acento principal */
--accent-blue:   #3DA4FF  /* Acento secundario */
--accent-mint:   #7CF2D4  /* Estado activo / online */
--gold:          #C89B3C  /* Robot / Bitcoin gold */
--gold-light:    #E0B85C  /* Highlights */
```

---

## Instalación local

```bash
git clone https://github.com/Truja503/BitBot.git
cd BitBot
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Abrí → **http://localhost:8000**

---

*Hecho con ❤️ en El Salvador · Proyecto CUBO+ 2026*
