const canvas = document.getElementById('tetris-canvas');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextContext = nextCanvas.getContext('2d');
const scoreElement = document.getElementById('score');

const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;

context.scale(BLOCK_SIZE, BLOCK_SIZE);
nextContext.scale(BLOCK_SIZE, BLOCK_SIZE);

const COLORS = [
    null,
    '#FF0D72', // T
    '#0DC2FF', // I
    '#0DFF72', // O
    '#F538FF', // L
    '#FF8E0D', // J
    '#FFE138', // S
    '#3877FF', // Z
];

const SHAPES = [
    [], // Empty
    [[1, 1, 1], [0, 1, 0]], // T
    [[2, 2, 2, 2]], // I
    [[3, 3], [3, 3]], // O
    [[0, 4, 0], [4, 4, 4]], // L
    [[0, 5, 0], [0, 5, 0], [5, 5, 0]], // J
    [[6, 6, 0], [0, 6, 6]], // S
    [[0, 7, 7], [7, 7, 0]], // Z
];

let board = createBoard();
let score = 0;
let currentPiece;
let nextPiece;

function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function createPiece() {
    const rand = Math.floor(Math.random() * (SHAPES.length - 1)) + 1;
    return {
        matrix: SHAPES[rand].map(row => [...row]),
        pos: { x: Math.floor(COLS / 2) - 1, y: 0 },
        color: COLORS[rand],
    };
}

function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = COLORS[value];
                context.fillRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawMatrix(board, { x: 0, y: 0 });
    drawMatrix(currentPiece.matrix, currentPiece.pos);
}

function drawNext() {
    nextContext.fillStyle = '#000';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    const matrix = nextPiece.matrix;
    const x = (nextCanvas.width / BLOCK_SIZE - matrix[0].length) / 2;
    const y = (nextCanvas.height / BLOCK_SIZE - matrix.length) / 2;
    matrix.forEach((row, row_y) => {
        row.forEach((value, col_x) => {
            if (value !== 0) {
                nextContext.fillStyle = COLORS[value];
                nextContext.fillRect(col_x + x, row_y + y, 1, 1);
            }
        });
    });
}

function merge(board, piece) {
    piece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + piece.pos.y][x + piece.pos.x] = value;
            }
        });
    });
}

function collide(board, piece) {
    const [m, o] = [piece.matrix, piece.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 && (board[y + o.y] && board[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function rotate(matrix, dir) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    let newMatrix = Array.from({ length: cols }, () => Array(rows).fill(0));

    if (dir > 0) { // Clockwise rotation
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                newMatrix[x][rows - 1 - y] = matrix[y][x];
            }
        }
    } else { // Counter-clockwise rotation
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                newMatrix[cols - 1 - x][y] = matrix[y][x];
            }
        }
    }
    return newMatrix;
}

function pieceDrop() {
    currentPiece.pos.y++;
    if (collide(board, currentPiece)) {
        currentPiece.pos.y--;
        merge(board, currentPiece);
        resetPiece();
        sweepBoard();
        updateScore();
    }
    dropCounter = 0;
}

function pieceMove(dir) {
    currentPiece.pos.x += dir;
    if (collide(board, currentPiece)) {
        currentPiece.pos.x -= dir;
    }
}

function pieceRotate() {
    const originalMatrix = currentPiece.matrix;
    const originalPos = { x: currentPiece.pos.x, y: currentPiece.pos.y };

    currentPiece.matrix = rotate(originalMatrix, 1); // Try clockwise rotation

    // Wall kick attempts
    const kickTests = [
        { x: 0, y: 0 }, // No kick
        { x: -1, y: 0 }, // Kick left 1
        { x: 1, y: 0 },  // Kick right 1
        { x: -2, y: 0 }, // Kick left 2
        { x: 2, y: 0 },  // Kick right 2
        { x: 0, y: -1 }, // Kick down 1 (for T-spin, but generally useful)
        { x: -3, y: 0 }, // Additional kick for I-piece
        { x: 3, y: 0 },  // Additional kick for I-piece
        { x: 0, y: -2 }, // Additional kick
    ];

    for (const test of kickTests) {
        currentPiece.pos.x = originalPos.x + test.x;
        currentPiece.pos.y = originalPos.y + test.y;
        if (!collide(board, currentPiece)) {
            // Found a valid position
            return;
        }
    }

    // If no valid position found, revert to original state
    currentPiece.matrix = originalMatrix;
    currentPiece.pos = originalPos;
}
}

function resetPiece() {
    currentPiece = nextPiece;
    nextPiece = createPiece();
    drawNext();
    if (collide(board, currentPiece)) {
        // Game Over
        board.forEach(row => row.fill(8)); // Use a different color for game over
        score = 'GAME OVER';
        updateScore();
        // Stop the game loop if you want
    }
}

function sweepBoard() {
    let rowCount = 1;
    outer: for (let y = board.length - 1; y > 0; --y) {
        for (let x = 0; x < board[y].length; ++x) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        ++y;
        score += rowCount * 10;
        rowCount *= 2;
    }
}

let dropCounter = 0;
let dropInterval = 1000; // 1 second
let lastTime = 0;

function update(time = 0) {
    if (score === 'GAME OVER') return;
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        pieceDrop();
    }
    draw();
    requestAnimationFrame(update);
}

function updateScore() {
    scoreElement.innerText = score;
}


document.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
        pieceMove(-1);
    } else if (event.key === 'ArrowRight') {
        pieceMove(1);
    } else if (event.key === 'ArrowDown') {
        pieceDrop();
    } else if (event.key === 'ArrowUp') {
        pieceRotate();
    }
});

nextPiece = createPiece();
resetPiece();
updateScore();
update();
