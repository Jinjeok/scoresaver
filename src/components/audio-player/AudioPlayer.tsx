"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import type { AudioTrackWithUrl } from "@/types/sheet";
import { formatDuration } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export interface AudioPlayerHandle {
  togglePlay: () => void;
  seek: (timeSec: number) => void;
  getTime: () => { currentTime: number; duration: number };
}

interface AudioPlayerProps {
  tracks: AudioTrackWithUrl[];
  onTimeUpdate?: (currentTimeMs: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onDurationChange?: (durationSec: number) => void;
}

export const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(
  function AudioPlayer({ tracks, onTimeUpdate, onPlayStateChange, onDurationChange }, ref) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);

    const selectedTrack = tracks[selectedTrackIndex];

    useEffect(() => {
      setIsPlaying(false);
      setCurrentTime(0);
    }, [selectedTrackIndex]);

    const handleTimeUpdate = useCallback(() => {
      const audio = audioRef.current;
      if (!audio) return;
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime * 1000);
    }, [onTimeUpdate]);

    const togglePlay = useCallback(async () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (isPlaying) {
        audio.pause();
      } else {
        await audio.play();
      }
      setIsPlaying(!isPlaying);
      onPlayStateChange?.(!isPlaying);
    }, [isPlaying, onPlayStateChange]);

    const seek = useCallback((timeSec: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = timeSec;
      setCurrentTime(timeSec);
    }, []);

    const getTime = useCallback(() => ({
      currentTime,
      duration,
    }), [currentTime, duration]);

    useImperativeHandle(ref, () => ({ togglePlay, seek, getTime }), [togglePlay, seek, getTime]);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const audio = audioRef.current;
      if (!audio) return;
      const time = parseFloat(e.target.value);
      audio.currentTime = time;
      setCurrentTime(time);
    };

    const toggleMute = () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.muted = !isMuted;
      setIsMuted(!isMuted);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const audio = audioRef.current;
      if (!audio) return;
      const vol = parseFloat(e.target.value);
      audio.volume = vol;
      setVolume(vol);
    };

    const handlePlaybackRate = (rate: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.playbackRate = rate;
      setPlaybackRate(rate);
    };

    if (tracks.length === 0) return null;

    return (
      <div className="bg-gray-900 text-white rounded-lg p-4 space-y-3">
        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          src={selectedTrack?.signedUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration);
              onDurationChange?.(audioRef.current.duration);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            onPlayStateChange?.(false);
          }}
        />

        {/* Track selector */}
        {tracks.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {tracks.map((track, i) => (
              <button
                key={track.id}
                onClick={() => setSelectedTrackIndex(i)}
                className={cn(
                  "px-3 py-1 text-xs rounded-full transition-colors cursor-pointer",
                  i === selectedTrackIndex
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                )}
              >
                {track.label}
              </button>
            ))}
          </div>
        )}

        {/* Transport controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="p-2 bg-indigo-600 rounded-full hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </button>

          <span className="text-xs text-gray-400 min-w-[40px]">
            {formatDuration(currentTime)}
          </span>

          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 accent-indigo-500"
          />

          <span className="text-xs text-gray-400 min-w-[40px]">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Volume & playback rate */}
        <div className="flex items-center gap-3 text-xs">
          <button onClick={toggleMute} className="cursor-pointer">
            {isMuted ? (
              <VolumeX className="h-4 w-4 text-gray-400" />
            ) : (
              <Volume2 className="h-4 w-4 text-gray-400" />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolumeChange}
            className="w-20 h-1 accent-indigo-500"
          />

          <div className="ml-auto flex gap-1">
            {[0.5, 0.75, 1, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                onClick={() => handlePlaybackRate(rate)}
                className={cn(
                  "px-2 py-0.5 rounded transition-colors cursor-pointer",
                  playbackRate === rate
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white"
                )}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
);
