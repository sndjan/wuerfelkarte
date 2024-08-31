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
  const [showLowerRows, setShowLowerRows] = useState(false); // State to control row visibility

  const categories = [
    {
      label: "Einsen",
      icon: <LooksOneIcon />,
      options: [1, 2, 3, 4, 5, 6, "✖"] as Array<number | string>,
    },
    {
      label: "Zweien",
      icon: <LooksTwoIcon />,
      options: [2, 4, 6, 8, 10, 12, "✖"] as Array<number | string>,
    },
    {
      label: "Dreien",
      icon: <Looks3Icon />,
      options: [3, 6, 9, 12, 15, 18, "✖"] as Array<number | string>,
    },
    {
      label: "Vieren",
      icon: <Looks4Icon />,
      options: [4, 8, 12, 16, 20, 24, "✖"] as Array<number | string>,
    },
    {
      label: "Fünfen",
      icon: <Looks5Icon />,
      options: [5, 10, 15, 20, 25, 30, "✖"] as Array<number | string>,
    },
    {
      label: "Sechsen",
      icon: <Looks6Icon />,
      options: [6, 12, 18, 24, 30, 36, "✖"] as Array<number | string>,
    },
    {
      label: "Dreierpasch",
      icon: <Filter3Icon />,
      options: [...Array.from({ length: 31 }, (_, i) => i), "✖"] as Array<
        number | string
      >,
    },
    {
      label: "Viererpasch",
      icon: <Filter4Icon />,
      options: [...Array.from({ length: 31 }, (_, i) => i), "✖"] as Array<
        number | string
      >,
    },
    {
      label: "Full House",
      icon: <HomeIcon />,
      options: [0, 25, "✖"] as Array<number | string>,
    },
    {
      label: "Kleine Straße",
      icon: <SignpostIcon />,
      options: [0, 30, "✖"] as Array<number | string>,
    },
    {
      label: "Große Straße",
      icon: <TrafficIcon />,
      options: [0, 40, "✖"] as Array<number | string>,
    },
    {
      label: "Kniffel",
      icon: <StarIcon />,
      options: [0, 50, "✖"] as Array<number | string>,
    },
    {
      label: "Chance",
      icon: <SecurityIcon />,
      options: [...Array.from({ length: 31 }, (_, i) => i), "✖"] as Array<
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
    setNewPlayerName("");
  };

  const handleAddPlayer = () => {
    if (newPlayerName.trim() === "") return;

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
                  width: "150px",
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
