/**
 * Puzzle-solving Model
 */
var gSolutionId = 0; //global variable used to generate solution IDs consistent across mutiple runs.
function resetSolutionIds() {
  gSolutionId = 0;
}

function Coordinate(row, col){
  this.row = row || 0;
  this.col = col || 0;
}

Coordinate.prototype.getXY = function(){
  var x = this.col * ORB_X_SEP + ORB_WIDTH/2;
  var y = this.row * ORB_Y_SEP + ORB_HEIGHT/2;
  return {x: x, y: y};
};

Coordinate.prototype.compareTo = function(coordinate){
  //rows take precedence over columns
  if (this.row > coordinate.row) {
    return -1;
  } else if (this.row < coordinate.row) {
    return 1;
  }
  if (this.col < coordinate.col) {
    return -1;
  } else if (this.col > coordinate.col) {
    return 1;
  }
  return 0;
};

//Orb inherits Coordinate
function Orb(type, row, col){
  Coordinate.call(this, row, col);
  this.type = type || "X";
}

Orb.prototype = Object.create(Coordinate.prototype);
Orb.prototype.constructor = Orb;

//override Coordinate compareTo
Orb.prototype.compareTo = function(orb){
  //type takes precedence over coordinates
  if (this.type < orb.type) {
    return -1;
  } else if (this.type > orb.type) {
    return 1;
  }
  //we don't care about position when comparing orbs
  return 0;
};

//type is a number between 0 and 6.
function Match(type, count){
  this.type = type;
  this.count = count;
}

Match.prototype.compareTo = function(match){
  //count takes precedence before type
  if (this.count > match.count) {
    return -1;
  } else if (this.count < match.count) {
    return 1;
  }
  if (this.type < match.type) {
    return -1;
  } else if (this.type > match.type) {
    return 1;
  }
  return 0;
};

function Solution(board, path, is_done, cursor, init_cursor, weight, matches){
  this.board = new Board(board.grid); //required
  this.path = path? path.slice() : new Array();
  this.is_done = is_done || false;
  this.cursor = cursor? new Coordinate(cursor.row,cursor.col) : new Coordinate();
  this.init_cursor = init_cursor? new Coordinate(init_cursor.row,init_cursor.col) : new Coordinate();;
  this.weight = weight || 0;
  this.matches = matches? matches.slice() : new Array();
  this.id = gSolutionId++;
}

Solution.prototype.insertMatch = function(match){
  this.matches = this.matches.splice(locationOf(match, this.matches)+1, 0, match);
};

Solution.prototype.solutionString = function(){
  return self.board.stateString();
};

function Board(grid){
  //grid is a Two-dimensional array of Orbs.
  this.grid = new Array(ROWS);
  var copy = (grid != null && typeof grid == "object");
  for (var i = 0; i < ROWS; ++ i) {
    this.grid[i] = new Array(COLS);
    for (var k = 0; k < COLS; ++ k) {
      if (!copy) {
        this.grid[i][k] = new Orb("X",i,k);
      } else {
        this.grid[i][k] = new Orb(grid[i][k].type,grid[i][k].row,grid[i][k].col);
      }
    }
  }
  
}

Board.prototype.clear = function(){
  this.grid = new Array(ROWS);
  for (var i = 0; i < ROWS; ++ i) {
    this.grid[i] = new Array(COLS);
    for (var k = 0; k < COLS; ++ k) {
      this.grid[i][k] = new Orb("X",i,k);
    }
  }
};

Board.prototype.refresh = function(){
  this.clear();
  var self = this;
  $('#grid > div').each(function() {
    var row = this.id.charAt(1);
    var col = this.id.charAt(2);
    var type = get_type(this);
    self.grid[row][col] = new Orb(type, row, col);
  });
};

Board.prototype.stateString = function(){
  var row, result = "";
  var self = this;
  for(var k=0;k<ROWS;++k){
    row = self.grid[k];
    for(var i=0;i<ROWS;++i){
      result += row[i].type + "";
      if( (i+1) >= ROWS && (k+1) < COLS) {
          result += "\n";
      }
    }
  }
  return result;
};

/**
 * "Painting" Model
 */
window.PaintBrush = {
  init: function(){
    PaintBrush.$image[0] = $("<img>", {id:'paintBrush', class:'palette'});
    PaintBrush.$image[1] = PaintBrush.$image[0].clone();
    PaintBrush.$image[0].attr("src",PaintBrush.BRUSH_0);
    PaintBrush.$image[1].attr("src",PaintBrush.BRUSH_1);
    PaintBrush.$image[0].appendTo("#pbPalette");
    $("#pbPalette").css("overflow","hidden");
//    $("<span />",{id:'pbBucketContainer'}).css("width","320px").css("display","inline-block").appendTo("#pbPalette");
    $("<span />",{id:'pbBucketContainer'}).appendTo("#pbPalette");
    $("<span />",{id:'pbBucket'}).css("overflow","hidden").appendTo("#pbBucketContainer").hide();
    /*
    $("<span />").addClass("vertLine").appendTo("#pbPalette");
    $("<img>",{id:'paint_X'}).attr("src",PaintBrush.ERASER).attr("class","palette paint").appendTo("#pbPalette");
    $("<div />",{id:'paint_0'}).attr("class","palette paint color e0 highlight").appendTo("#pbPalette");
    $("<div />",{id:'paint_1'}).attr("class","palette paint color e1").appendTo("#pbPalette");
    $("<div />",{id:'paint_2'}).attr("class","palette paint color e2").appendTo("#pbPalette");
    $("<div />",{id:'paint_3'}).attr("class","palette paint color e3").appendTo("#pbPalette");
    $("<div />",{id:'paint_4'}).attr("class","palette paint color e4").appendTo("#pbPalette");
    $("<div />",{id:'paint_5'}).attr("class","palette paint color e5").appendTo("#pbPalette");
    $("<div />",{id:'paint_6'}).attr("class","palette paint color e6").appendTo("#pbPalette");
    */
    $("<span />").addClass("vertLine").appendTo("#pbBucket");
    $("<img>",{id:'paint_X'}).attr("src",PaintBrush.ERASER).attr("class","palette paint").appendTo("#pbBucket");
    $("<div />",{id:'paint_0'}).attr("class","palette paint color e0 highlight").appendTo("#pbBucket");
    $("<div />",{id:'paint_1'}).attr("class","palette paint color e1").appendTo("#pbBucket");
    $("<div />",{id:'paint_2'}).attr("class","palette paint color e2").appendTo("#pbBucket");
    $("<div />",{id:'paint_3'}).attr("class","palette paint color e3").appendTo("#pbBucket");
    $("<div />",{id:'paint_4'}).attr("class","palette paint color e4").appendTo("#pbBucket");
    $("<div />",{id:'paint_5'}).attr("class","palette paint color e5").appendTo("#pbBucket");
    $("<div />",{id:'paint_6'}).attr("class","palette paint color e6").appendTo("#pbBucket");
    $(".paint, #paintBrush").on("click", setPaint);
  },
  enabled: false,
  mouseDown: false,
  color: 0,
  $image: [],
  BRUSH_0: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB8AAAAfCAYAAAAfrhY5AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjExR/NCNwAAAVhJREFUWEfFkrFKxjAUhf+Hsa4KLg5OOgnqXvhB+EcfwFXc+g6Cgw+gOLt17Uv0Ta49gSvJ7UlM2lSHrySn5/I1JTsR+TdouCVXx6cCsKaFLYDw9amT58OD3ByduA+gxdpYMUBOyzVh4j/57UyspwazgVrExHpqMBuqgS/en18Gcr8XDNUgVwyCzVpSYv93K8FmDSkxsH0wC5Zwf31XLAY0LOH95c1JY2K8tzMKDUvA746Jvz4+pwqfAzTMJSV+3B+mCp9TaJhDSnx7djFV+JwPDX9jHEcBa8SAhilUDIZhcBdqiRjQMIYV930vXde5dakY0DBGTIy17eZAQ0ZtMaChZQsxoKFPTAxstxQaKluKAQ2bphFFxW3bujU+xvaXEmx8qY+K/W4NfhZMatFuLdyDiRj+YA3cpWIii16+XKyIkXVqXDiG3vzFclwmJlTwXmVMEsOK5sjuG4akjK5VSzlGAAAAAElFTkSuQmCC",
  BRUSH_1: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB8AAAAfCAIAAACQzIFuAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjExR/NCNwAAAUdJREFUSEu1kr1OwzAUhfsUdKqQkBg6VHSLKtSFjQmGPABCYgMmhkx5Ada+b3ti3/rn2MaOHa6+qj7O0ZfK7mp1Ov8jnJdgu96Aae3utgPp+0v/enx6uFEvoMctuGowbbqPWyD1kidDavnhwDSqCdXyw4Ep1WHUh7utsduCXc0nowZemENUbc9E44ViompAtRr7425fpAacc3y+fcAbqrFPzQnOOXAmofrn65tqAuc/iaqfD0eqWTiniar3t/dU8+Cc4FfNPDXgHEOrMeM44vZK1YBzgIiVehiGvu+xKFIDzgGhGgvqJOHs06QGnB1a1YDzlVCNoU4ezopl1IDy+jpa3XUdFngT1UoxK7E6o9WmUIP+El9sbLUCfESTGK89F5ypaGKjbjczbHQRTWxwqzTTX0ddsjtsdMHVicwf7GujONLDRsPpfAE11CWsQrN1eAAAAABJRU5ErkJggg==",
  ERASER: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB8AAAAfCAYAAAAfrhY5AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjExR/NCNwAAARVJREFUWEfFjoG2wyAIQ/fp/XM3XKmQRsGy8x7n3E1Tkvhqrf0bVNzhM/LTwW8RVMxiixXcWUHFLFhswV0GFTNgGQM9CBUjsCQC/QoVIzA8yy0HhQgM3MVl2UsEBlXoeTY8AgMq9DwbvgLNVXqmLZiBxipXrh5WoLnKlauHGWis4rLtBUFjlVs+ChZjugIqSIzFXSzG4Eb1XcSK3IQuDgMd/Z5FLAwufg3h2IIVssq4C8OQGt2fISsz/GUYtke9FpFX+MvX8Hhs8Znl8pFxGIbSZIuFcfhhufxl8JfzAU8fYbwudwYXHzxgt1igoqBhZ2A4u8UCFS32EWeBG/jmvBFUZNgSBu5noOJfQUXlOI5WBTMH7fUGwi4u6gcKLJ4AAAAASUVORK5CYII="
};