import React, { useState, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';

export default function ChessBoardView({
  fen,
  onMakeMove,
  orientation = 'white',
  disabled = false,
  isCheck = false,
  turn = 'white',
  lastMove = null,
  chessInstance = null
}) {
  const [selectedSquare, setSelectedSquare] = useState(null);

  // Compute legal move targets for the selected square (if chess instance provided)
  const legalMoveSquares = useMemo(() => {
    if (!chessInstance || !selectedSquare) return {};
    const moves = chessInstance.moves({ square: selectedSquare, verbose: true });
    const styles = {};
    moves.forEach((m) => {
      styles[m.to] = {
        background: chessInstance.get(m.to)
          ? 'radial-gradient(circle, rgba(239, 68, 68, 0.6) 80%, transparent 80%)'
          : 'radial-gradient(circle, rgba(59, 130, 246, 0.5) 25%, transparent 25%)',
        borderRadius: '50%'
      };
    });
    return styles;
  }, [chessInstance, selectedSquare]);

  // Combine square styles (selected square, legal dots, last move, and check)
  const customSquareStyles = useMemo(() => {
    const styles = { ...legalMoveSquares };

    // Highlight last move
    if (lastMove) {
      if (lastMove.from) {
        styles[lastMove.from] = {
          backgroundColor: 'rgba(250, 204, 21, 0.35)'
        };
      }
      if (lastMove.to) {
        styles[lastMove.to] = {
          backgroundColor: 'rgba(250, 204, 21, 0.45)'
        };
      }
    }

    // Highlight selected square
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: 'rgba(59, 130, 246, 0.5)'
      };
    }

    // Highlight King if in check
    if (isCheck && chessInstance) {
      const currentTurnColor = turn === 'white' ? 'w' : 'b';
      const board = chessInstance.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.type === 'k' && piece.color === currentTurnColor) {
            const files = 'abcdefgh';
            const square = `${files[c]}${8 - r}`;
            styles[square] = {
              backgroundColor: 'rgba(239, 68, 68, 0.7)',
              boxShadow: 'inset 0 0 10px rgba(185, 28, 28, 0.9)'
            };
          }
        }
      }
    }

    return styles;
  }, [legalMoveSquares, lastMove, selectedSquare, isCheck, chessInstance, turn]);

  // Drag and drop handler
  const handlePieceDrop = (sourceSquare, targetSquare) => {
    if (disabled) return false;
    const success = onMakeMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q' // Default auto-queen promotion
    });
    setSelectedSquare(null);
    return success;
  };

  // Click-to-move handler
  const handleSquareClick = (square) => {
    if (disabled) return;

    if (!selectedSquare) {
      // Check if clicked square has a piece of the current turn
      if (chessInstance) {
        const piece = chessInstance.get(square);
        const currentTurnColor = turn === 'white' ? 'w' : 'b';
        if (piece && piece.color === currentTurnColor) {
          setSelectedSquare(square);
        }
      }
    } else {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }

      // Try making move from selectedSquare to clicked square
      const success = onMakeMove({
        from: selectedSquare,
        to: square,
        promotion: 'q'
      });

      if (!success && chessInstance) {
        // If clicking another of own piece, change selection
        const piece = chessInstance.get(square);
        const currentTurnColor = turn === 'white' ? 'w' : 'b';
        if (piece && piece.color === currentTurnColor) {
          setSelectedSquare(square);
          return;
        }
      }

      setSelectedSquare(null);
    }
  };

  return (
    <div className="relative w-full max-w-[560px] aspect-square mx-auto rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-slate-900">
      <Chessboard
        position={fen}
        onPieceDrop={handlePieceDrop}
        onSquareClick={handleSquareClick}
        boardOrientation={orientation}
        arePiecesDraggable={!disabled}
        customSquareStyles={customSquareStyles}
        customDarkSquareStyle={{ backgroundColor: '#779952' }}
        customLightSquareStyle={{ backgroundColor: '#edeed1' }}
        animationDuration={200}
      />
    </div>
  );
}
