import { useContext, useEffect, useState } from 'react';
import Terminal, { ColorMode, TerminalInput, TerminalOutput } from 'react-terminal-ui';
import { SocketContext } from '../utils/contexts/SocketContext';
import { UserContext } from '../utils/contexts/UserContext';

export const TerminalController = (props = {}) => {
  const { user, counter, loading, setCounter, allegiance } = useContext(UserContext);
  const socket = useContext(SocketContext);
  
  const defaultLines = user && counter && allegiance ? [
    <TerminalOutput key={Math.random()}>&gt; CPU CORE 0: {allegiance.val.p0[0]}kB / {allegiance.val.p0[1]}kB </TerminalOutput>,
    <TerminalOutput key={Math.random()}>&gt; CPU CORE 1: {allegiance.val.p1[0]}GB / {allegiance.val.p1[1]}GB </TerminalOutput>,
    <TerminalOutput key={Math.random()}>&gt; CPU CORE 2: {allegiance.val.p2[0]}MB / {allegiance.val.p2[1]}MB </TerminalOutput>,
    <TerminalOutput key={Math.random()}>&gt; ssh-keygen: USER {user.uuid}: {user.inventory ? user.inventory.filter(item => {return item['type'] === 'key'}).length : 0} / 6 SECURE KEYS CREATED</TerminalOutput>,
    <TerminalOutput key={Math.random()}>&gt; ssh-keygen: GROUP {allegiance.name}: {allegiance.val.team_inventory ? allegiance.val.team_inventory.filter(item => {return item['type'] === 'key'}).length : 0} / 5 SECURE KEYS CREATED</TerminalOutput>,
    <TerminalOutput key={Math.random()}>&gt; LOADED SUCCESSFULLY AT {Date.now()}</TerminalOutput>
  ] : [];
  const [terminalLineData, setTerminalLineData] = useState(user && counter && allegiance ? defaultLines : []);

  useEffect(() => {
    socket.on('addToTerminal', function(data) {
      const { response, responseColor } = data;
      setTerminalLineData(prevLines => {
          let ld = [...prevLines];
            ld.push(
              <TerminalOutput key={Math.random()}><span style={{color: responseColor}}>{response}</span></TerminalOutput>
            )
          if(ld.length > 21) {
            ld = ld.slice(-21)
          }
          return ld;
      });
    });

    return () => {
      socket.off('addToTerminal');
    }
  },[]);

  function handleInput(input: string) {
      let ld = [...terminalLineData];
      const isAnswerAttempt = input.toLocaleLowerCase().trim().match(/^answer (.*)$/i);
      const isSolveAttempt = input.toLocaleLowerCase().trim().match(/^solve (.*)$/i);
      ld.push(<TerminalInput key={Math.random()}>{input}</TerminalInput>);
    if (['help', '-help', '--help', 'h', '-h', '--h'].includes(input.toLocaleLowerCase().trim())) {
      ld.push(
      <TerminalOutput key={Math.random()}>hint</TerminalOutput>,
      <TerminalOutput key={Math.random()}>-- GRANTS USER UNIQUE HINT</TerminalOutput>,
      <TerminalOutput key={Math.random()}>question [number?]</TerminalOutput>,
      <TerminalOutput key={Math.random()}>-- DISPLAYS CURRENT QUESTION</TerminalOutput>,
      <TerminalOutput key={Math.random()}>answer &lt;answer&gt;</TerminalOutput>,
      <TerminalOutput key={Math.random()}>-- SUBMITS ANSWER ATTEMPT. USERS MAY NOT ATTEMPT TWO QUESTIONS IN A ROW</TerminalOutput>,
      <TerminalOutput key={Math.random()}>clear</TerminalOutput>,
      <TerminalOutput key={Math.random()}>-- CLEARS TERMINAL</TerminalOutput>,
      );
    } else if (input.toLocaleLowerCase().trim() === 'hint') {
      socket.emit('requestHint');
    } else if (input.toLocaleLowerCase().trim() === 'clear') {
      ld = defaultLines;
    } else if (input.toLocaleLowerCase().startsWith('question') && allegiance) {
      const match = input.match(/^question\s*(\d+)?$/i);
      if (match) {
        const questionIndex = match[1] ? parseInt(match[1]) - 1 : allegiance.val.q.qH.length - 1;
        const question = allegiance.val.q.qH[questionIndex];
        if (question) {
          ld.push(<TerminalOutput key={Math.random()}>"{question}"</TerminalOutput>);
        } else {
          ld.push(<TerminalOutput key={Math.random()}>{`No question ${questionIndex + 1} found`}</TerminalOutput>);
        }
      } else {
        ld.push(<TerminalOutput key={Math.random()}>{`Unrecognized question number: ${input}`}</TerminalOutput>);        
      }
    } else if(isAnswerAttempt && allegiance && counter) {
      if(Date.now() < allegiance.val.q.tTA) {
        ld.push(<TerminalOutput key={Math.random()}><span style={{color: 'red'}}>ERROR: MUST WAIT {allegiance.val.q.tTA - Date.now()} BEFORE NEXT ATTEMPT</span></TerminalOutput>);
      } else if(counter.uuid === allegiance.val.q.lU) {
        ld.push(<TerminalOutput key={Math.random()}><span style={{color: 'red'}}>ERROR: USER MAY NOT SUBMIT TWO ANSWERS IN A ROW</span></TerminalOutput>);
      } else {
        ld.push(<TerminalOutput key={Math.random()}>SUBMITTING ANSWER "{isAnswerAttempt[1].trim()}"</TerminalOutput>);
        socket.emit('submitQuizAnswer', isAnswerAttempt[1].trim());
      }
    } else if(isSolveAttempt && allegiance && counter && counter.roles.includes('emboldened') && !counter.roles.includes('ascended')) {
        ld.push(<TerminalOutput key={Math.random()}>SUBMITTING SOLUTION "{isSolveAttempt[1].trim()}"</TerminalOutput>);
        socket.emit('submitSolve', isSolveAttempt[1].trim());
    } else if (input) {
      ld.push(<TerminalOutput key={Math.random()}>Unrecognized command</TerminalOutput>);
    }
    if(ld.length > 21) {
      ld = ld.slice(-21)
    }
    setTerminalLineData(ld);
  }

  if(counter && !loading && allegiance) {
    return (
      <div className="container" style={{maxWidth: '100%'}}>
        <Terminal name='ssh-keygen' colorMode={ ColorMode.Dark }  onInput={ terminalInput => handleInput(terminalInput) }>
          { terminalLineData }
        </Terminal>
      </div>
    )
  } else {
    return <></>
  }
  };