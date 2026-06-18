import { useState, useRef, useCallback, useEffect } from 'react';
import type {
  TimerState,
  TimerSegment,
  RestInterval,
  TimerResult,
  UseClimbTimerOptions,
  Route,
} from '@/types';

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

interface RouteInfo {
  routeId: number;
  routeName?: string;
  routeGrade?: string;
  routeColor?: string;
}

function extractRouteInfo(route: Route | number | RouteInfo): RouteInfo {
  if (typeof route === 'number') {
    return { routeId: route };
  }
  if ('id' in route && typeof (route as Route).id === 'number') {
    const r = route as Route;
    return {
      routeId: r.id,
      routeName: r.name,
      routeGrade: r.grade,
      routeColor: r.color,
    };
  }
  return route as RouteInfo;
}

export function useClimbTimer(options: UseClimbTimerOptions = {}) {
  const { onFinish, onSegmentAdd } = options;

  const [state, setState] = useState<TimerState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [currentSegmentDuration, setCurrentSegmentDuration] = useState(0);
  const [segments, setSegments] = useState<TimerSegment[]>([]);
  const [restIntervals, setRestIntervals] = useState<RestInterval[]>([]);

  const startTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);
  const segmentStartTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const lastSegmentEndTimeRef = useRef<number>(0);
  const perfToAbsOffsetRef = useRef<number>(0);

  const updateElapsed = useCallback(() => {
    if (state !== 'running') return;
    const now = performance.now();
    const current = accumulatedTimeRef.current + (now - startTimeRef.current);
    const currentSeg = now - segmentStartTimeRef.current;
    setElapsed(current);
    setCurrentSegmentDuration(currentSeg);
    rafRef.current = requestAnimationFrame(updateElapsed);
  }, [state]);

  useEffect(() => {
    if (state === 'running') {
      rafRef.current = requestAnimationFrame(updateElapsed);
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [state, updateElapsed]);

  const start = useCallback(() => {
    if (state !== 'idle') {
      throw new Error(
        `[ClimbTimer] Cannot start timer from state '${state}'. Expected state 'idle'.`
      );
    }
    const nowPerf = performance.now();
    const nowAbs = Date.now();
    perfToAbsOffsetRef.current = nowAbs - nowPerf;
    startTimeRef.current = nowPerf;
    accumulatedTimeRef.current = 0;
    segmentStartTimeRef.current = nowPerf;
    startedAtRef.current = nowAbs;
    lastSegmentEndTimeRef.current = 0;
    setSegments([]);
    setRestIntervals([]);
    setElapsed(0);
    setCurrentSegmentDuration(0);
    setState('running');
  }, [state]);

  const pause = useCallback(() => {
    if (state !== 'running') {
      throw new Error(
        `[ClimbTimer] Cannot pause timer from state '${state}'. Expected state 'running'.`
      );
    }
    const now = performance.now();
    accumulatedTimeRef.current += now - startTimeRef.current;
    startTimeRef.current = now;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setState('paused');
  }, [state]);

  const resume = useCallback(() => {
    if (state !== 'paused') {
      throw new Error(
        `[ClimbTimer] Cannot resume timer from state '${state}'. Expected state 'paused'.`
      );
    }
    startTimeRef.current = performance.now();
    setState('running');
  }, [state]);

  const addSegment = useCallback(
    (route: Route | number | RouteInfo) => {
      if (state !== 'running') {
        throw new Error(
          `[ClimbTimer] Cannot add segment from state '${state}'. Expected state 'running'.`
        );
      }

      const nowPerf = performance.now();
      const nowAbs = nowPerf + perfToAbsOffsetRef.current;
      const routeInfo = extractRouteInfo(route);
      const segmentStartPerf = segmentStartTimeRef.current;
      const segmentStartAbs = segmentStartPerf + perfToAbsOffsetRef.current;
      const segmentDuration = nowPerf - segmentStartPerf;
      const lastSegmentEndPerf = lastSegmentEndTimeRef.current;

      const newSegment: TimerSegment = {
        id: generateId(),
        routeId: routeInfo.routeId,
        routeName: routeInfo.routeName,
        routeGrade: routeInfo.routeGrade,
        routeColor: routeInfo.routeColor,
        startTime: segmentStartAbs,
        endTime: nowAbs,
        duration: segmentDuration,
        index: segments.length,
      };

      if (lastSegmentEndPerf > 0) {
        const restInterval: RestInterval = {
          id: generateId(),
          previousSegmentId: segments[segments.length - 1].id,
          nextSegmentId: newSegment.id,
          startTime: lastSegmentEndPerf + perfToAbsOffsetRef.current,
          endTime: segmentStartAbs,
          duration: segmentStartPerf - lastSegmentEndPerf,
        };
        setRestIntervals((prev) => [...prev, restInterval]);
      }

      lastSegmentEndTimeRef.current = nowPerf;
      segmentStartTimeRef.current = nowPerf;

      const updatedSegments = [...segments, newSegment];
      setSegments(updatedSegments);
      onSegmentAdd?.(newSegment, updatedSegments);

      return newSegment;
    },
    [state, segments, onSegmentAdd]
  );

  const calculateRestStats = useCallback(
    (intervals: RestInterval[]) => {
      if (intervals.length === 0) {
        return {
          count: 0,
          averageRest: 0,
          shortestRest: 0,
          longestRest: 0,
        };
      }

      const durations = intervals.map((i) => i.duration);
      const total = durations.reduce((sum, d) => sum + d, 0);

      return {
        count: intervals.length,
        averageRest: total / intervals.length,
        shortestRest: Math.min(...durations),
        longestRest: Math.max(...durations),
      };
    },
    []
  );

  const buildResult = useCallback(
    (endTime: number, endedAtAbs: number): TimerResult => {
      const totalDuration = accumulatedTimeRef.current + (endTime - startTimeRef.current);
      const totalClimbTime = segments.reduce((sum, s) => sum + s.duration, 0);
      const totalRestTime = restIntervals.reduce((sum, r) => sum + r.duration, 0);

      return {
        totalDuration,
        totalClimbTime,
        totalRestTime,
        segments: [...segments],
        restIntervals: [...restIntervals],
        restStats: calculateRestStats(restIntervals),
        startedAt: startedAtRef.current,
        endedAt: endedAtAbs,
      };
    },
    [segments, restIntervals, calculateRestStats]
  );

  const end = useCallback((): TimerResult => {
    if (state !== 'running' && state !== 'paused') {
      throw new Error(
        `[ClimbTimer] Cannot end timer from state '${state}'. Expected state 'running' or 'paused'.`
      );
    }

    const now = performance.now();
    const nowAbs = now + perfToAbsOffsetRef.current;
    let buildEndTime: number;

    if (state === 'running') {
      accumulatedTimeRef.current += now - startTimeRef.current;
      startTimeRef.current = now;
      buildEndTime = now;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    } else {
      buildEndTime = startTimeRef.current;
    }

    const result = buildResult(buildEndTime, nowAbs);
    setState('finished');
    setElapsed(accumulatedTimeRef.current);
    onFinish?.(result);

    return result;
  }, [state, buildResult, onFinish]);

  const reset = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startTimeRef.current = 0;
    accumulatedTimeRef.current = 0;
    segmentStartTimeRef.current = 0;
    startedAtRef.current = 0;
    lastSegmentEndTimeRef.current = 0;
    perfToAbsOffsetRef.current = 0;
    setSegments([]);
    setRestIntervals([]);
    setElapsed(0);
    setCurrentSegmentDuration(0);
    setState('idle');
  }, []);

  return {
    state,
    elapsed,
    segments,
    restIntervals,
    currentSegmentDuration,
    start,
    pause,
    resume,
    addSegment,
    end,
    reset,
  };
}
