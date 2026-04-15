const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const blockButtons = document.querySelectorAll('.block-btn');
const clearBtn = document.getElementById('clear-btn');

// Configuración del juego
const TILE_SIZE = 32;
const ROWS = 15;
const COLS = 20;

canvas.width = COLS * TILE_SIZE;
canvas.height = ROWS * TILE_SIZE;

// Definición de bloques
const blockTypes = {
    grass: { color: '#4caf50', name: 'Hierba' },
    dirt: { color: '#795548', name: 'Tierra' },
    stone: { color: '#9e9e9e', name: 'Piedra' },
    wood: { color: '#5d4037', name: 'Madera' }
};

let currentBlockType = 'grass';
let world = [];
let mousePos = { x: -1, y: -1 };

// Inicializar mundo vacío
function initWorld() {
    for (let r = 0; r < ROWS; r++) {
        world[r] = [];
        for (let c = 0; c < COLS; c++) {
            // Añadir un suelo base
            if (r > ROWS - 4) {
                world[r][c] = (r === ROWS - 4) ? 'grass' : 'dirt';
            } else {
                world[r][c] = null;
            }
        }
    }
}

// Dibujar el mundo
function draw() {
    // Limpiar fondo (cielo)
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dibujar bloques
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const blockType = world[r][c];
            if (blockType) {
                ctx.fillStyle = blockTypes[blockType].color;
                ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                
                // Bordes para que se vean como bloques
                ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // Dibujar hover
    if (mousePos.x !== -1 && mousePos.y !== -1) {
        const col = Math.floor(mousePos.x / TILE_SIZE);
        const row = Math.floor(mousePos.y / TILE_SIZE);
        
        if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
            ctx.fillStyle = blockTypes[currentBlockType].color;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = 'white';
            ctx.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }

    // Dibujar rejilla (tenue)
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TILE_SIZE, 0);
        ctx.lineTo(i * TILE_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let j = 0; j <= ROWS; j++) {
        ctx.beginPath();
        ctx.moveTo(0, j * TILE_SIZE);
        ctx.lineTo(canvas.width, j * TILE_SIZE);
        ctx.stroke();
    }
}

// Seguimiento de mouse para hover
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;
    draw();
});

canvas.addEventListener('mouseleave', () => {
    mousePos.x = -1;
    mousePos.y = -1;
    draw();
});

// Manejar clicks
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);

    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
        if (e.button === 0) { // Click izquierdo - Poner
            world[row][col] = currentBlockType;
        } else if (e.button === 2) { // Click derecho - Quitar
            world[row][col] = null;
        }
        draw();
    }
});

// Prevenir menú contextual en click derecho
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Selección de bloques
blockButtons.forEach(btn => {
    if (btn.id !== 'clear-btn') {
        btn.addEventListener('click', () => {
            blockButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            currentBlockType = btn.dataset.type;
        });
    }
});

// Botón de limpiar
clearBtn.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que quieres limpiar todo el mundo?')) {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                world[r][c] = null;
            }
        }
        draw();
    }
});

// Inicio
initWorld();
draw();
