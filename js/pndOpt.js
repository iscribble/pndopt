var ROWS = 5;
var COLS = 6;
var TYPES = 7;
var ORB_X_SEP = 64;
var ORB_Y_SEP = 64;
var ORB_WIDTH = 60;
var ORB_HEIGHT = 60;
var MULTI_ORB_BONUS = 0.25;
var COMBO_BONUS = 0.25;
var MAX_SOLUTIONS_COUNT = ROWS * COLS * 8 * 2 + 381;
//381 is the minimum addition to properly solve bbprbbbggprbgbhprgybhhgryybgrr

//Gets result map of board using each grid>div id name as a rc key.
function get_board() {
  var result = new Board();
  $('#grid > div').each(function () {
    var row = this.id.charAt(1);
    var col = this.id.charAt(2);
    var type = get_type(this);
    result.grid[row][col] = new Orb(type, row, col);
  });
  return result;
}

//Iterates through the board throwing an exception if type 'X' discovered.
function ensure_no_X(board) {
  for (var i = 0; i < ROWS; ++i) {
    for (var j = 0; j < COLS; ++j) {
      if (board.grid[i][j].type == 'X') {
        throw 'Cannot have "?" orbs when solving.';
      }
    }
  }
}

//regex matches class name patterns such as eX, e6, e0
function get_type(elem) {
  return elem.className.match(/e([\dX])/)[1];
}

function advance_type(type, dt) {
  if (type == 'X') {
    return '0';
  } else {
    var new_type = dt + +type;
    if (new_type < 0) {
      new_type += TYPES;
    } else if (new_type >= TYPES) {
      new_type -= TYPES;
    }
    return new_type;
  }
}

function get_weights() {
  var weights = new Array(TYPES);
  for (var i = 0; i < TYPES; ++i) {
    weights[i] = {
      normal: +$('#e' + i + '-normal').val(),
      mass: +$('#e' + i + '-mass').val(),
    };
  }
  return weights;
}

//prev_1_orb means first orb in a sequence of three+
//prev_2_orb means second orb in a sequence of three+
//curr_orb is the current orb
//1. Fill match_board with matching colors.
//2. Populate the matches array with {type,count} objects, one for each match.
function find_matches(boardGrid) {
  var match_board = new Board();

  // 1. filter all 3+ consecutives.
  //  (a) horizontals    
  for (var i = 0; i < ROWS; ++i) {
    var prev_1_orb_tp = 'X';
    var prev_2_orb_tp = 'X';
    for (var j = 0; j < COLS; ++j) {
      var cur_orb = boardGrid[i][j];
      if (prev_1_orb_tp == prev_2_orb_tp && prev_2_orb_tp == cur_orb.type && cur_orb.type != 'X') {
        match_board.grid[i][j].type = cur_orb.type;
        match_board.grid[i][j - 1].type = cur_orb.type;
        match_board.grid[i][j - 2].type = cur_orb.type;
      }
      prev_1_orb_tp = prev_2_orb_tp;
      prev_2_orb_tp = cur_orb.type;
    }
  }
  //  (b) verticals
  for (var j = 0; j < COLS; ++j) {
    var prev_1_orb_tp = 'X';
    var prev_2_orb_tp = 'X';
    for (var i = 0; i < ROWS; ++i) {
      var cur_orb = boardGrid[i][j];
      if (prev_1_orb_tp == prev_2_orb_tp && prev_2_orb_tp == cur_orb.type && cur_orb.type != 'X') {
        match_board.grid[i][j].type = cur_orb.type;
        match_board.grid[i - 1][j].type = cur_orb.type;
        match_board.grid[i - 2][j].type = cur_orb.type;
      }
      prev_1_orb_tp = prev_2_orb_tp;
      prev_2_orb_tp = cur_orb.type;
    }
  }

  var scratch_board = new Board(match_board.grid);

  // 2. enumerate the matches by flood-fill.
  var matches = [];
  for (var i = 0; i < ROWS; ++i) {
    for (var j = 0; j < COLS; ++j) {
      var cur_orb = new Orb(scratch_board.grid[i][j].type, i, j);
      if (cur_orb.type == "X") {
        continue;
      } //if this position isn't part of a series, skip it.
      var stack = [new Coordinate(i, j)];
      var count = 0;
      while (stack.length) { //while at least one item on the stack...
        var n = stack.pop(); //n is the current rc object from the stack
        if (scratch_board.grid[n.row][n.col].type == "undefined" ||
          scratch_board.grid[n.row][n.col].type != cur_orb.type) {
          continue;
        } //Stop searching if this orb doesn't match the board.
        ++count;

        scratch_board.grid[n.row][n.col].type = "X"; //we have n. clear the scratch board for this starting spot.
        if (n.row > 0) {
          stack.push(new Coordinate(n.row - 1, n.col));
        } //if we aren't on the first row, add the orb above this one to the stack.
        if (n.row < ROWS - 1) {
          stack.push(new Coordinate(n.row + 1, n.col));
        } //if we aren't on the last row, add the orb below this one to the stack.
        if (n.col > 0) {
          stack.push(new Coordinate(n.row, n.col - 1));
        } //if we aren't in the first column, add the orb to the left of this one to the stack.
        if (n.col < COLS - 1) {
          stack.push(new Coordinate(n.row, n.col + 1));
        } //if we aren't in the last column, add the orb to the right of this one to the stack.
      }
      matches.push(new Match(cur_orb.type, count));
    }
  }

  return {
    matches: matches,
    board: match_board
  };
}

//compares two match collections
function equals_matches(a, b) {
  if (a.length != b.length) {
    return false;
  }
  for (var i = 0; i < a.length; i++) {
    if (a[i].compareTo(b[i]) != 0) {
      return false;
    }
  }
  return true;
}

function compute_weight(matches, weights) {
  var total_weight = 0;
  matches.forEach(function (m) {
    var base_weight = weights[m.type][m.count >= 5 ? 'mass' : 'normal'];
    var multi_orb_bonus = (m.count - 3) * MULTI_ORB_BONUS + 1;
    total_weight += multi_orb_bonus * base_weight;
  });
  var combo_bonus = (matches.length - 1) * COMBO_BONUS + 1;
  return (total_weight * combo_bonus).toFixed(2);
}

function show_element_type(jqel, type) {
  jqel.removeClass('eX');
  for (var i = 0; i < TYPES; ++i) {
    jqel.removeClass('e' + i);
  }
  jqel.addClass('e' + type);
}

function show_board(board) {
  for (var i = 0; i < ROWS; ++i) {
    for (var j = 0; j < COLS; ++j) {
      var type = board.grid[i][j].type;
      if (typeof (type) == 'undefined') {
        type = 'X';
      }
      show_element_type($('#o' + i + '' + j), type);
    }
  }
}

function in_place_remove_matches(board, match_board) {
  for (var i = 0; i < ROWS; ++i) {
    for (var j = 0; j < COLS; ++j) {
      if (match_board.grid[i][j].type != 'X') {
        board.grid[i][j].type = 'X';
      }
    }
  }
  return board;
}

//starting in the last row and moving up, if this orb is not an x, decrement dest_i
// as we travel upward, assign this orb's type to the orb in dest_i's row.
// once we finish the column, change all rows above last orb to 'X'
function in_place_drop_empty_spaces(board) {
  for (var j = 0; j < COLS; ++j) {
    var dest_i = ROWS - 1;
    for (var src_i = ROWS - 1; src_i >= 0; --src_i) {
      if (board.grid[src_i][j].type != 'X') {
        board.grid[dest_i][j].type = board.grid[src_i][j].type;
        --dest_i;
      }
    }
    for (; dest_i >= 0; --dest_i) {
      board.grid[dest_i][j].type = 'X';
    }
  }
  return board;
}

//direction 0 is to the right, incremented clockwise.
function can_move_orb(rc, dir) {
  switch (dir) {
  case 0:
    return rc.col < COLS - 1;
  case 1:
    return rc.row < ROWS - 1 && rc.col < COLS - 1;
  case 2:
    return rc.row < ROWS - 1;
  case 3:
    return rc.row < ROWS - 1 && rc.col > 0;
  case 4:
    return rc.col > 0;
  case 5:
    return rc.row > 0 && rc.col > 0;
  case 6:
    return rc.row > 0;
  case 7:
    return rc.row > 0 && rc.col < COLS - 1;
  }
  return false;
}

function in_place_move_rc(rc, dir) {
  switch (dir) {
  case 0:
    rc.col += 1;
    break;
  case 1:
    rc.row += 1;
    rc.col += 1;
    break;
  case 2:
    rc.row += 1;
    break;
  case 3:
    rc.row += 1;
    rc.col -= 1;
    break;
  case 4:
    rc.col -= 1;
    break;
  case 5:
    rc.row -= 1;
    rc.col -= 1;
    break;
  case 6:
    rc.row -= 1;
    break;
  case 7:
    rc.row -= 1;
    rc.col += 1;
    break;
  }
}

function in_place_swap_orb(board, rc, dir) {
  var old_rc = new Coordinate(rc.row, rc.col);
  in_place_move_rc(rc, dir);
  var orig_type = board.grid[old_rc.row][old_rc.col].type;
  board.grid[old_rc.row][old_rc.col].type = board.grid[rc.row][rc.col].type;
  board.grid[rc.row][rc.col].type = orig_type;
  return {
    board: board,
    rc: rc
  };
}

//returns a copied solution board, path and is_done.
function copy_solution_with_cursor(solution, i, j, init_cursor) {
  //Solution(board, path, is_done, cursor, init_cursor, weight, matches)
  return new Solution(solution.board, solution.path, solution.is_done, new Coordinate(i, j), init_cursor || new Coordinate(i, j));
}

function copy_solution(solution) {
  return copy_solution_with_cursor(solution,
    solution.cursor.row, solution.cursor.col,
    solution.init_cursor);
}

function in_place_evaluate_solution(solution, weights) {
  var current_board = new Board(solution.board.grid);
  var all_matches = [];
  while (true) {
    var matches = find_matches(current_board.grid); //matches is actually matches and board object... (of match_board)
    if (matches.matches.length == 0) {
      break;
    }
    in_place_remove_matches(current_board, matches.board);
    in_place_drop_empty_spaces(current_board);
    all_matches = all_matches.concat(matches.matches);
  }
  solution.weight = compute_weight(all_matches, weights);
  solution.matches = all_matches.slice();
  return current_board;
}

function can_move_orb_in_solution(solution, dir) {
  // Don't allow going back directly. It's pointless.
  if (solution.path[solution.path.length - 1] == (dir + 4) % 8) {
    return false;
  }
  return can_move_orb(solution.cursor, dir);
}

function in_place_swap_orb_in_solution(solution, dir) {
  var res = in_place_swap_orb(solution.board, solution.cursor, dir);
  solution.cursor = res.rc;
  solution.path.push(dir);
}

function get_max_path_length() {
  return +$('#max-length').val();
}

function set_max_path_length(length) {
  $('#max-length').val(length);
}

function is_8_dir_movement_supported() {
  return $('#allow-8')[0].checked;
}

//creates a list of solutions, one for every direction.
//Then adds to existing solutions, sorts and cuts the weakest choices.
function evolve_solutions(solutions, weights, dir_step) {
  var new_solutions = [];
  solutions.forEach(function (s) {
    if (s.is_done) {
      return;
    }
    for (var dir = 0; dir < 8; dir += dir_step) {
      if (!can_move_orb_in_solution(s, dir)) {
        continue;
      }
      var solution = copy_solution(s);
      in_place_swap_orb_in_solution(solution, dir);
      in_place_evaluate_solution(solution, weights);
      new_solutions.push(solution);
    }
    s.is_done = true;
  });
  solutions = solutions.concat(new_solutions);
  solutions.sort(function (a, b) {
    return b.weight - a.weight;
  });
  return solutions.slice(0, MAX_SOLUTIONS_COUNT * Number($('#max-depth').val()));

}

function solve_board(board, step_callback, finish_callback) {
  var solutions = new Array();
  var weights = get_weights();

  var seed_solution = new Solution(board);
  in_place_evaluate_solution(seed_solution, weights);

  for (var i = 0, s = 0; i < ROWS; ++i) {
    for (var j = 0; j < COLS; ++j, ++s) {
      solutions[s] = copy_solution_with_cursor(seed_solution, i, j);
    }
  }

  var solve_state = {
    step_callback: step_callback,
    finish_callback: finish_callback,
    max_length: get_max_path_length(),
    dir_step: is_8_dir_movement_supported() ? 1 : 2,
    p: 0,
    solutions: solutions,
    weights: weights,
    solveBoard: board,
  };
  solve_board_step(solve_state);
}

function solve_board_step(solve_state) {
  if (solve_state.p >= solve_state.max_length) {
    solve_state.finish_callback(solve_state.solutions, solve_state.solveBoard);
    return;
  }

  ++solve_state.p;
  solve_state.solutions = evolve_solutions(solve_state.solutions,
    solve_state.weights,
    solve_state.dir_step);
  solve_state.step_callback(solve_state.p, solve_state.max_length);

  setTimeout(function () {
    solve_board_step(solve_state);
  }, 0);

}

function add_solution_as_li(html_array, solution) {
  html_array.push('<li>W=');
  html_array.push(solution.weight);
  html_array.push(', L=');
  html_array.push(solution.path.length);
  var sorted_matches = solution.matches.slice();
  //sort the colors of each match
  sorted_matches.sort(function (a, b) {
    return a.compareTo(b);
  });
  sorted_matches.forEach(function (match, i) {
    html_array.push(', <span class="e');
    html_array.push(match.type);
    html_array.push('"></span> &times; ');
    html_array.push(match.count);
  });
  html_array.push('</li>');
}

function simplify_path(xys) {
  // 1. Remove intermediate points.
  var simplified_xys = [xys[0]];
  var xys_length_1 = xys.length - 1;
  for (var i = 1; i < xys_length_1; ++i) {
    var dx0 = xys[i].x - xys[i - 1].x;
    var dx1 = xys[i + 1].x - xys[i].x;
    if (dx0 == dx1) {
      var dy0 = xys[i].y - xys[i - 1].y;
      var dy1 = xys[i + 1].y - xys[i].y;
      if (dy0 == dy1) {
        continue;
      }
    }
    simplified_xys.push(xys[i]);
  }
  simplified_xys.push(xys[xys_length_1]);

  return simplified_xys;
}

//if the starting location is the same and if the matches are the same, only use the first solution found.
function simplify_solutions(solutions, limit) {
  limit = limit || solutions.length;
  var count = 1;
  simplified_solutions = [];
  solutions.forEach(function (solution) {
    if (count > limit) {
      return;
    }
    for (var s = simplified_solutions.length - 1; s >= 0; --s) {
      var simplified_solution = simplified_solutions[s];
      if (simplified_solution.init_cursor.compareTo(solution.init_cursor) != 0) {
        continue;
      }
      if (!equals_matches(simplified_solution.matches, solution.matches)) {
        continue;
      }
      //same starting point, same matches...replace, not add-on @dnapack
      if (simplified_solution.path.length > solution.path.length) {
        simplified_solutions[s] = solution;
      }
      return;
    }
    count++;
    simplified_solutions.push(solution);
  });
  return simplified_solutions;
}

function draw_line_to(canvas, px, py, x, y) {
  var mx = (px * 2 + x) / 3;
  var my = (py * 2 + y) / 3;
  canvas.lineTo(mx, my);
  var dx = x - px;
  var dy = y - py;
  var dr = Math.sqrt(dx * dx + dy * dy) / 3;
  dx /= dr;
  dy /= dr;
  canvas.lineTo(mx - (dx + dy), my + (dx - dy));
  canvas.lineTo(mx - (dx - dy), my - (dx + dy));
  canvas.lineTo(mx, my);
  canvas.lineTo(x, y);
}

function draw_path(solution) {
  var canvas = clear_canvas();
  var xys = getSimplePathXYs(solution);
  solution.simpleXYs = xys;

  canvas.lineWidth = 4;
  canvas.strokeStyle = 'rgba(0, 0, 0, 0.75)';
  canvas.beginPath();
  for (var i = 0; i < xys.length; ++i) {
    var xy = xys[i];
    if (i == 0) {
      canvas.moveTo(xy.x, xy.y);
    } else {
      var prev_xy = xys[i - 1];
      draw_line_to(canvas, prev_xy.x, prev_xy.y, xy.x, xy.y);
    }
  }
  canvas.stroke();

  var init_xy = xys[0];
  var final_xy = xys[xys.length - 1];

  canvas.lineWidth = 2;
  canvas.fillStyle = 'red';
  canvas.strokeStyle = 'black';
  canvas.beginPath();
  canvas.rect(init_xy.x - 5, init_xy.y - 5, 10, 10);
  canvas.fill();
  canvas.stroke();

  canvas.fillStyle = 'lime';
  canvas.beginPath();
  canvas.rect(final_xy.x - 5, final_xy.y - 5, 10, 10);
  canvas.fill();
  canvas.stroke();

  return xys;
}

function clear_canvas() {
  var canvas_elem = $('#path')[0];
  var canvas = canvas_elem.getContext('2d');
  canvas.clearRect(0, 0, canvas_elem.width, canvas_elem.height);
  $('#hand').hide();
  return canvas;
}

function displaySolutions(solutions, solveBoard) {
  var count=0, html_array = [];
  last_solution_state = solutions.slice();
  solutions = simplify_solutions(solutions, 300);
  var sortType = $('input:radio[name=sortType]:checked').val();
  solutions.sort(function (a, b) {
    //weight first, then path
    var rm = b.weight - a.weight;
    if (sortType == "length") {
      return (rm != 0) ? rm : (a.path.length - b.path.length);
    }
    //else sort by turns
    return (rm != 0) ? rm : deepSolutionSort(a, b);
  });
  global_solutions = solutions;
  solutions.forEach(function (solution) {
    if (count < MAX_SOLUTIONS_COUNT) {
      add_solution_as_li(html_array, solution, solveBoard);
    }
    count++;
  });
  $('#solutions > ol').html(html_array.join(''));
  $('#solve').get(0).disabled = false;
  endTest("PAD");
}

function deepSolutionSort(a, b) {
  a.simpleXYs = getSimplePathXYs(a);
  b.simpleXYs = getSimplePathXYs(b);
  var turns = a.simpleXYs.length - b.simpleXYs.length;
  return turns != 0 ? turns : (a.path.length - b.path.length);
}

function getSimplePathXYs(solution) {
  if (solution.simplyXYs) {
    return solution.simplyXYs; //solved already
  }
  var init_rc = solution.init_cursor;
  var path = solution.path;
  var rc = new Coordinate(init_rc.row, init_rc.col);
  var xys = [rc.getXY()];
  path.forEach(function (p) {
    in_place_move_rc(rc, p);
    xys.push(rc.getXY());
  });

  return simplify_path(xys);
}

//Used to increase path length without losing current progress.
//Increase is the number of steps(>0) to expand the maximum path.
function lengthenSolutions(increase) {
  beginTest("PAD");
  $('#solve').get(0).disabled = true;
  var step_cb = function (p, max_p) {
    $('#status').text('Solving (' + p + '/' + max_p + ')...');
  };

  var max_length = get_max_path_length(); //plus what? if we 
  var solve_state = {
    step_callback: step_cb,
    finish_callback: displaySolutions,
    max_length: max_length + increase,
    dir_step: is_8_dir_movement_supported() ? 1 : 2,
    p: max_length,
    solutions: last_solution_state,
    weights: get_weights(),
    solveBoard: new Board(global_board.grid),
  };
  set_max_path_length(solve_state.max_length);
  solve_board_step(solve_state);
}
