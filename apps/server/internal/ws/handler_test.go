package ws

import (
	"testing"
)

func TestConnectionTracker_Acquire(t *testing.T) {
	tracker := NewConnectionTracker(3)

	// First acquisition should succeed
	if !tracker.Acquire("192.168.1.1") {
		t.Error("expected first acquisition to succeed")
	}
	if tracker.Count("192.168.1.1") != 1 {
		t.Errorf("expected count 1, got %d", tracker.Count("192.168.1.1"))
	}

	// Second and third acquisitions should succeed
	if !tracker.Acquire("192.168.1.1") {
		t.Error("expected second acquisition to succeed")
	}
	if !tracker.Acquire("192.168.1.1") {
		t.Error("expected third acquisition to succeed")
	}

	// Fourth acquisition should fail (limit is 3)
	if tracker.Acquire("192.168.1.1") {
		t.Error("expected fourth acquisition to fail")
	}

	// Different IP should succeed
	if !tracker.Acquire("192.168.1.2") {
		t.Error("expected different IP acquisition to succeed")
	}
}

func TestConnectionTracker_Release(t *testing.T) {
	tracker := NewConnectionTracker(3)

	// Acquire 2 connections
	tracker.Acquire("192.168.1.1")
	tracker.Acquire("192.168.1.1")

	if tracker.Count("192.168.1.1") != 2 {
		t.Errorf("expected count 2, got %d", tracker.Count("192.168.1.1"))
	}

	// Release one
	tracker.Release("192.168.1.1")
	if tracker.Count("192.168.1.1") != 1 {
		t.Errorf("expected count 1 after release, got %d", tracker.Count("192.168.1.1"))
	}

	// Release last one
	tracker.Release("192.168.1.1")
	if tracker.Count("192.168.1.1") != 0 {
		t.Errorf("expected count 0 after releasing all, got %d", tracker.Count("192.168.1.1"))
	}

	// Release on zero count should not go negative
	tracker.Release("192.168.1.1")
	if tracker.Count("192.168.1.1") != 0 {
		t.Errorf("expected count to stay at 0, got %d", tracker.Count("192.168.1.1"))
	}
}

func TestConnectionTracker_Count(t *testing.T) {
	tracker := NewConnectionTracker(10)

	// Count for non-existent IP should be 0
	if tracker.Count("10.0.0.1") != 0 {
		t.Errorf("expected count 0 for non-existent IP, got %d", tracker.Count("10.0.0.1"))
	}

	tracker.Acquire("10.0.0.1")
	tracker.Acquire("10.0.0.1")
	tracker.Acquire("10.0.0.1")

	if tracker.Count("10.0.0.1") != 3 {
		t.Errorf("expected count 3, got %d", tracker.Count("10.0.0.1"))
	}
}

func TestConnectionTracker_ConcurrentAccess(t *testing.T) {
	tracker := NewConnectionTracker(100)

	// Simulate concurrent access
	done := make(chan bool)
	for i := 0; i < 50; i++ {
		go func() {
			for j := 0; j < 10; j++ {
				tracker.Acquire("127.0.0.1")
				tracker.Release("127.0.0.1")
			}
			done <- true
		}()
	}

	// Wait for all goroutines
	for i := 0; i < 50; i++ {
		<-done
	}

	// Final count should be 0 (all acquired then released)
	if tracker.Count("127.0.0.1") != 0 {
		t.Errorf("expected count 0 after concurrent acquire/release, got %d", tracker.Count("127.0.0.1"))
	}
}

func TestNewConnectionTracker(t *testing.T) {
	tracker := NewConnectionTracker(5)

	if tracker == nil {
		t.Fatal("expected tracker to be created")
	}
	if tracker.maxPer != 5 {
		t.Errorf("expected maxPer 5, got %d", tracker.maxPer)
	}
	if tracker.conns == nil {
		t.Error("expected conns map to be initialized")
	}
}

func TestConnectionTracker_MultipleIPs(t *testing.T) {
	tracker := NewConnectionTracker(2)

	ips := []string{"1.1.1.1", "2.2.2.2", "3.3.3.3"}

	// Acquire connections for multiple IPs
	for _, ip := range ips {
		if !tracker.Acquire(ip) {
			t.Errorf("expected first acquisition for %s to succeed", ip)
		}
		if !tracker.Acquire(ip) {
			t.Errorf("expected second acquisition for %s to succeed", ip)
		}
		// Third should fail (limit is 2)
		if tracker.Acquire(ip) {
			t.Errorf("expected third acquisition for %s to fail", ip)
		}
	}

	// Verify counts
	for _, ip := range ips {
		if tracker.Count(ip) != 2 {
			t.Errorf("expected count 2 for %s, got %d", ip, tracker.Count(ip))
		}
	}

	// Release all
	for _, ip := range ips {
		tracker.Release(ip)
		tracker.Release(ip)
	}

	// All counts should be 0
	for _, ip := range ips {
		if tracker.Count(ip) != 0 {
			t.Errorf("expected count 0 for %s after release, got %d", ip, tracker.Count(ip))
		}
	}
}
