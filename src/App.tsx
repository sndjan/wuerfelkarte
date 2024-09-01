import React, { useEffect, useState } from "react";
import JSConfetti from "js-confetti";
import { MouseEvent } from "react";
import {
  Container,
  Typography,
  IconButton,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  MenuItem,
  Select,
  FormControl,
  TextField,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Box,
  Menu,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import LooksOneIcon from "@mui/icons-material/LooksOne";
import LooksTwoIcon from "@mui/icons-material/LooksTwo";
import Looks3Icon from "@mui/icons-material/Looks3";
import Looks4Icon from "@mui/icons-material/Looks4";
import Looks5Icon from "@mui/icons-material/Looks5";
import Looks6Icon from "@mui/icons-material/Looks6";
import Filter3Icon from "@mui/icons-material/Filter3";
import Filter4Icon from "@mui/icons-material/Filter4";
import FunctionsIcon from "@mui/icons-material/Functions";
import SignpostIcon from "@mui/icons-material/Signpost";
import TrafficIcon from "@mui/icons-material/Traffic";
import HomeIcon from "@mui/icons-material/Home";
import StarIcon from "@mui/icons-material/Star";
import SecurityIcon from "@mui/icons-material/Security";
import ArrowCircleDownIcon from "@mui/icons-material/ArrowCircleDown";
import ArrowCircleUpIcon from "@mui/icons-material/ArrowCircleUp";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useCookies } from "react-cookie";

interface Player {
  id: number;
  name: string;
  scores: { [key: string]: number | string };
}

const App: React.FC = () => {
  const [cookies, setCookie, removeCookie] = useCookies(["players"]);
  const jsConfetti = new JSConfetti();
  const [players, setPlayers] = useState<Player[]>([
    { id: 1, name: "Player 1", scores: {} },
    { id: 2, name: "Player 2", scores: {} },
  ]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [showLowerRows, setShowLowerRows] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const categories = [
    {
      label: "Einsen",
      icon: <LooksOneIcon />,
      options: ["✖", 0, 1, 2, 3, 4, 5] as Array<number | string>,
    },
    {
      label: "Zweien",
      icon: <LooksTwoIcon />,
      options: ["✖", 0, 2, 4, 6, 8, 10] as Array<number | string>,
    },
    {
      label: "Dreien",
      icon: <Looks3Icon />,
      options: ["✖", 0, 3, 6, 9, 12, 15] as Array<number | string>,
    },
    {
      label: "Vieren",
      icon: <Looks4Icon />,
      options: ["✖", 0, 4, 8, 12, 16, 20] as Array<number | string>,
    },
    {
      label: "Fünfen",
      icon: <Looks5Icon />,
      options: ["✖", 0, 5, 10, 15, 20, 25] as Array<number | string>,
    },
    {
      label: "Sechsen",
      icon: <Looks6Icon />,
      options: ["✖", 0, 6, 12, 18, 24, 30] as Array<number | string>,
    },
    {
      label: "Dreierpasch",
      icon: <Filter3Icon />,
      options: ["✖", ...Array.from({ length: 26 }, (_, i) => i + 5)] as Array<
        number | string
      >,
    },
    {
      label: "Viererpasch",
      icon: <Filter4Icon />,
      options: ["✖", ...Array.from({ length: 26 }, (_, i) => i + 5)] as Array<
        number | string
      >,
    },
    {
      label: "Full House",
      icon: <HomeIcon />,
      options: ["✖", 0, 25] as Array<number | string>,
    },
    {
      label: "Kleine Straße",
      icon: <SignpostIcon />,
      options: ["✖", 0, 30] as Array<number | string>,
    },
    {
      label: "Große Straße",
      icon: <TrafficIcon />,
      options: ["✖", 0, 40] as Array<number | string>,
    },
    {
      label: "Kniffel",
      icon: <StarIcon />,
      options: ["✖", 0, 50] as Array<number | string>,
    },
    {
      label: "Chance",
      icon: <SecurityIcon />,
      options: ["✖", ...Array.from({ length: 26 }, (_, i) => i + 5)] as Array<
        number | string
      >,
    },
  ];

  const calculateUpperSum = (scores: { [key: string]: number | string }) => {
    return categories
      .slice(0, 6)
      .reduce(
        (sum, category) =>
          sum + (parseInt(scores[category.label] as string) || 0),
        0
      );
  };

  const calculateLowerSum = (scores: { [key: string]: number | string }) => {
    return categories
      .slice(6)
      .reduce(
        (sum, category) =>
          sum + (parseInt(scores[category.label] as string) || 0),
        0
      );
  };

  const calculateSum = (scores: { [key: string]: number | string }) => {
    return calculateUpperSum(scores) > 62
      ? calculateLowerSum(scores) + calculateUpperSum(scores) + 35
      : calculateLowerSum(scores) + calculateUpperSum(scores);
  };

  const handleScoreChange = (
    playerId: number,
    category: string,
    value: number
  ) => {
    if (value === 50) {
      jsConfetti.addConfetti({ emojis: ["⭐"] });
    }
    setPlayers(
      players.map((player) =>
        player.id === playerId
          ? { ...player, scores: { ...player.scores, [category]: value } }
          : player
      )
    );
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewPlayerName("");
  };

  const handleAddPlayer = () => {
    if (newPlayerName.trim() === "") return;

    const newPlayer: Player = {
      id: players.length > 0 ? players[players.length - 1].id + 1 : 1,
      name: newPlayerName,
      scores: {},
    };
    setPlayers([...players, newPlayer]);
    handleCloseDialog();
  };

  const removePlayer = (id: number) => {
    setPlayers(players.filter((player) => player.id !== id));
  };

  const getRanking = (sum: number) => {
    const sorted = [...players].sort(
      (a, b) => calculateSum(b.scores) - calculateSum(a.scores)
    );
    if (sum === calculateSum(sorted[0].scores)) {
      return "gold";
    } else if (sum === calculateSum(sorted[1].scores)) {
      return "silver";
    } else if (sum === calculateSum(sorted[2].scores)) {
      return "#cd7f32";
    }
  };

  useEffect(() => {
    setCookie("players", players, { maxAge: 31536000 });
  }, [players]);

  useEffect(() => {
    if (cookies.players) {
      setPlayers(cookies.players);
    }
  }, []);

  function handleViewScoreboard(event: MouseEvent<HTMLLIElement>): void {
    throw new Error("Function not implemented.");
  }

  function handleClearAllScores(event: MouseEvent<HTMLLIElement>): void {
    removeCookie("players");
    window.location.reload();
  }

  function handleMenuOpen(event: MouseEvent<HTMLButtonElement>): void {
    setAnchorEl(event.currentTarget);
  }

  function handleMenuClose(
    event: {},
    reason: "backdropClick" | "escapeKeyDown"
  ): void {
    setAnchorEl(null);
  }

  return (
    <Container maxWidth="lg" style={{ marginTop: "2rem" }}>
      <Box
        sx={{
          position: "absolute",
          right: "1rem",
        }}
      >
        <IconButton onClick={handleMenuOpen}>
          <MoreVertIcon />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          {/*<MenuItem onClick={handleViewScoreboard}>Scoreboard ansehen</MenuItem>*/}
          <MenuItem onClick={handleClearAllScores}>Alles zurücksetzen</MenuItem>
        </Menu>
      </Box>
      <Typography variant="h4" gutterBottom align="center">
        Würfelkarte
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell
                style={{
                  position: "sticky",
                  left: 0,
                  background: "#fff",
                  zIndex: 1,
                  width: "150px",
                }}
              ></TableCell>
              {players.map((player) => (
                <TableCell key={player.id} align="center">
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Typography
                      variant="h6"
                      style={{ marginLeft: "0.5rem", textAlign: "center" }}
                    >
                      {player.name}
                    </Typography>
                    <IconButton onClick={() => removePlayer(player.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </div>
                </TableCell>
              ))}
              <TableCell>
                <IconButton onClick={handleOpenDialog} color="primary">
                  <PersonAddIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.slice(0, 6).map((category, catIndex) => (
              <TableRow key={catIndex}>
                <TableCell
                  style={{
                    position: "sticky",
                    left: 0,
                    background: "#fff",
                    zIndex: 1,
                    width: "150px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Tooltip title={category.label} arrow placement="top">
                      {category.icon}
                    </Tooltip>
                  </div>
                </TableCell>
                {players.map((player) => (
                  <TableCell key={player.id} align="center">
                    <FormControl size="small">
                      <Select
                        value={player.scores[category.label] || ""}
                        onChange={(e) =>
                          handleScoreChange(
                            player.id,
                            category.label,
                            e.target.value as unknown as number
                          )
                        }
                        style={{ width: "80px" }}
                      >
                        {category.options.map((option) => (
                          <MenuItem key={option as string} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow>
              <TableCell
                style={{
                  position: "sticky",
                  left: 0,
                  background: "#fff",
                  zIndex: 1,
                  width: "150px",
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "row" }}>
                  <Tooltip title={"Summe unten"} arrow placement="top">
                    <FunctionsIcon />
                  </Tooltip>
                  <ArrowCircleUpIcon />
                </Box>
              </TableCell>
              {players.map((player) => (
                <TableCell key={player.id} align="center">
                  <Typography variant="h6">
                    {calculateUpperSum(player.scores)}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell
                style={{
                  position: "sticky",
                  left: 0,
                  background: "#fff",
                  zIndex: 1,
                  width: "150px",
                }}
              >
                <Tooltip title={"Bonus: 35"} arrow placement="top">
                  <AddCircleIcon />
                </Tooltip>
              </TableCell>
              {players.map((player) => (
                <TableCell key={player.id} align="center">
                  <Typography variant="h6">
                    {calculateUpperSum(player.scores) > 62 ? (
                      <CheckCircleIcon color="success" />
                    ) : null}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
            {categories.slice(6).map((category, catIndex) => (
              <TableRow key={catIndex}>
                <TableCell
                  style={{
                    position: "sticky",
                    left: 0,
                    background: "#fff",
                    zIndex: 1,
                    width: "150px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Tooltip title={category.label} arrow placement="top">
                      {category.icon}
                    </Tooltip>
                  </div>
                </TableCell>
                {players.map((player) => (
                  <TableCell key={player.id} align="center">
                    <FormControl size="small">
                      <Select
                        value={player.scores[category.label] || ""}
                        onChange={(e) =>
                          handleScoreChange(
                            player.id,
                            category.label,
                            e.target.value as unknown as number
                          )
                        }
                        style={{ width: "80px" }}
                      >
                        {category.options.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {showLowerRows && ( // Conditionally render the following rows
              <>
                <TableRow>
                  <TableCell
                    style={{
                      position: "sticky",
                      left: 0,
                      background: "#fff",
                      zIndex: 1,
                      width: "150px",
                    }}
                  >
                    <Box sx={{ display: "flex", flexDirection: "row" }}>
                      <Tooltip title={"Summe unten"} arrow placement="top">
                        <FunctionsIcon />
                      </Tooltip>
                      <ArrowCircleDownIcon />
                    </Box>
                  </TableCell>
                  {players.map((player) => (
                    <TableCell key={player.id} align="center">
                      <Typography variant="h6">
                        {calculateLowerSum(player.scores)}
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell
                    style={{
                      position: "sticky",
                      left: 0,
                      background: "#fff",
                      zIndex: 1,
                      width: "150px",
                    }}
                  >
                    <Tooltip title={"Summe gesamt"} arrow placement="top">
                      <FunctionsIcon />
                    </Tooltip>
                  </TableCell>
                  {players.map((player) => (
                    <TableCell key={player.id} align="center">
                      <Box
                        sx={{
                          backgroundColor: getRanking(
                            calculateSum(player.scores)
                          ),
                        }}
                      >
                        <Typography variant="h6">
                          {calculateSum(player.scores)}
                        </Typography>
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ marginTop: "1rem", textAlign: "center" }}>
        <Button
          variant="contained"
          color="primary"
          sx={{ my: 3 }}
          onClick={() => setShowLowerRows(!showLowerRows)}
        >
          Summe {showLowerRows ? "verstecken" : "anzeigen"}
        </Button>
      </Box>
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Neuen Spieler hinzufügen</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Spielername"
            type="text"
            fullWidth
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Abbrechen
          </Button>
          <Button onClick={handleAddPlayer} color="primary">
            Hinzufügen
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default App;
