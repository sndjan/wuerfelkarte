import React, { useState } from "react";
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
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
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
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

interface Player {
  id: number;
  name: string;
  scores: { [key: string]: number | string };
}

const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([
    { id: 1, name: "Player 1", scores: {} },
    { id: 2, name: "Player 2", scores: {} },
  ]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");

  const categories = [
    {
      label: "Einsen",
      icon: <LooksOneIcon />,
      factor: 1,
      options: [1, 2, 3, 4, 5, 6],
    },
    {
      label: "Zweien",
      icon: <LooksTwoIcon />,
      factor: 2,
      options: [2, 4, 6, 8, 10, 12],
    },
    {
      label: "Dreien",
      icon: <Looks3Icon />,
      factor: 3,
      options: [3, 6, 9, 12, 15, 18],
    },
    {
      label: "Vieren",
      icon: <Looks4Icon />,
      factor: 4,
      options: [4, 8, 12, 16, 20, 24],
    },
    {
      label: "Fünfen",
      icon: <Looks5Icon />,
      factor: 5,
      options: [5, 10, 15, 20, 25, 30],
    },
    {
      label: "Sechsen",
      icon: <Looks6Icon />,
      factor: 6,
      options: [6, 12, 18, 24, 30, 36],
    },
    {
      label: "Dreierpasch",
      icon: <Filter3Icon />,
      factor: 3,
      options: Array.from({ length: 31 }, (_, i) => i),
    },
    {
      label: "Viererpasch",
      icon: <Filter4Icon />,
      factor: 4,
      options: Array.from({ length: 31 }, (_, i) => i),
    },
    { label: "Full House", icon: <HomeIcon />, factor: 1, options: [0, 25] },
    {
      label: "Kleine Straße",
      icon: <SignpostIcon />,
      factor: 1,
      options: [0, 30],
    },
    {
      label: "Große Straße",
      icon: <TrafficIcon />,
      factor: 1,
      options: [0, 40],
    },
    { label: "Kniffel", icon: <StarIcon />, factor: 1, options: [0, 50] },
    {
      label: "Chance",
      icon: <SecurityIcon />,
      factor: 1,
      options: Array.from({ length: 31 }, (_, i) => i),
    },
  ];

  const calculateUpperSum = (scores: { [key: string]: number | string }) => {
    return categories
      .slice(0, 6) // Kategorien "Einsen" bis "Sechsen"
      .reduce(
        (sum, category) =>
          sum + (parseInt(scores[category.label] as string) || 0),
        0
      );
  };

  const calculateLowerSum = (scores: { [key: string]: number | string }) => {
    return categories
      .slice(6) // Restliche Kategorien
      .reduce(
        (sum, category) =>
          sum + (parseInt(scores[category.label] as string) || 0),
        0
      );
  };

  const handleScoreChange = (
    playerId: number,
    category: string,
    value: number
  ) => {
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
    setNewPlayerName(""); // Zurücksetzen des Namens
  };

  const handleAddPlayer = () => {
    if (newPlayerName.trim() === "") return; // Kein leerer Name hinzufügen

    const newPlayer: Player = {
      id: players.length + 1,
      name: newPlayerName,
      scores: {},
    };
    setPlayers([...players, newPlayer]);
    handleCloseDialog();
  };

  const removePlayer = (id: number) => {
    setPlayers(players.filter((player) => player.id !== id));
  };

  return (
    <Container maxWidth="lg" style={{ marginTop: "2rem" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-evenly",
        }}
      >
        <Typography variant="h4" gutterBottom align="center">
          Würfelkarte
        </Typography>
      </Box>
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
                  width: "150px", // Oder eine andere feste Breite für die linke Spalte
                }}
              ></TableCell>
              {players.map((player) => (
                <TableCell key={player.id} align="center">
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <PersonIcon />
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
                    width: "150px", // Oder eine andere feste Breite für die linke Spalte
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
            <TableRow>
              <TableCell
                style={{
                  position: "sticky",
                  left: 0,
                  background: "#fff",
                  zIndex: 1,
                  width: "150px", // Oder eine andere feste Breite für die linke Spalte
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "row" }}>
                  <FunctionsIcon />
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
                  width: "150px", // Oder eine andere feste Breite für die linke Spalte
                }}
              >
                <AddCircleIcon />
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
                    width: "150px", // Oder eine andere feste Breite für die linke Spalte
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
            <TableRow>
              <TableCell
                style={{
                  position: "sticky",
                  left: 0,
                  background: "#fff",
                  zIndex: 1,
                  width: "150px", // Oder eine andere feste Breite für die linke Spalte
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "row" }}>
                  <FunctionsIcon />
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
                  width: "150px", // Oder eine andere feste Breite für die linke Spalte
                }}
              >
                <FunctionsIcon />
              </TableCell>
              {players.map((player) => (
                <TableCell key={player.id} align="center">
                  <Typography variant="h6">
                    {calculateUpperSum(player.scores) > 62
                      ? calculateLowerSum(player.scores) +
                        calculateUpperSum(player.scores) +
                        35
                      : calculateLowerSum(player.scores) +
                        calculateUpperSum(player.scores)}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
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
