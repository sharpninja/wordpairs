export const contractExpectations = {
  "AC-01-T01": {
    "attempts": [
      {
        "path": "code",
        "authority": "slot-authority",
        "result": {
          "membership": "player",
          "roomId": "room-a"
        }
      },
      {
        "path": "browse",
        "authority": "slot-authority",
        "result": {
          "membership": "player",
          "roomId": "room-a"
        }
      },
      {
        "path": "quick-match",
        "authority": "slot-authority",
        "result": {
          "membership": "player",
          "roomId": "room-a"
        }
      },
      {
        "path": "deep-link",
        "authority": "slot-authority",
        "result": {
          "membership": "player",
          "roomId": "room-a"
        }
      }
    ]
  },
  "AC-02-T01": {
    "capacityResults": [
      {
        "capacity": 1,
        "accepted": false
      },
      {
        "capacity": 2,
        "accepted": true
      },
      {
        "capacity": 8,
        "accepted": true
      },
      {
        "capacity": 25,
        "accepted": true
      },
      {
        "capacity": 26,
        "accepted": false
      }
    ],
    "fullJoin": {
      "result": "no-slot",
      "playersAfter": [
        "p1",
        "p2"
      ],
      "versionAfter": 7
    }
  },
  "AC-02-T02": {
    "results": [
      {
        "commandId": "join-2",
        "result": "joined"
      },
      {
        "commandId": "join-3",
        "result": "no-slot"
      }
    ],
    "playersAfter": [
      "p1",
      "p2"
    ],
    "membershipsForFinalSeat": 1
  },
  "AC-03-T01": {
    "persistedIcon": "owl",
    "projections": {
      "room": "owl",
      "scorecard": "owl",
      "summary": "owl",
      "standings": "owl"
    }
  },
  "AC-04-T01": {
    "randomCalls": [
      {
        "min": 1,
        "max": 3
      },
      {
        "min": 1,
        "max": 3
      }
    ],
    "selections": [
      {
        "randomValue": 1,
        "anchorId": "p9"
      },
      {
        "randomValue": 3,
        "anchorId": "p7"
      }
    ]
  },
  "AC-04-T02": {
    "attempts": [
      {
        "actorId": "p2",
        "result": "chosen",
        "matchVersion": 2
      },
      {
        "actorId": "p1",
        "result": "forbidden",
        "matchVersion": 2
      }
    ],
    "categoryId": "animals"
  },
  "AC-05-T01": {
    "rounds": [
      {
        "pairId": "a1",
        "background": "forest.svg",
        "controls": {
          "readable": true
        }
      },
      {
        "pairId": "a2",
        "background": "forest.svg",
        "controls": {
          "readable": true
        }
      },
      {
        "pairId": "s1",
        "background": "stars.svg",
        "controls": {
          "readable": true
        }
      }
    ],
    "missingAsset": {
      "background": "accessible-fallback",
      "label": "Category artwork unavailable"
    }
  },
  "AC-06-T01": {
    "results": [
      {
        "answer": "cat",
        "accepted": true,
        "scoreDelta": 5
      },
      {
        "answer": "dog",
        "accepted": false,
        "scoreDelta": 0
      },
      {
        "answer": "cat",
        "accepted": true,
        "scoreDelta": 0
      }
    ],
    "scoreAfter": 5
  },
  "AC-07-T01": {
    "results": [
      {
        "stage": "hint-1",
        "scoreDelta": 3
      },
      {
        "stage": "hint-2",
        "scoreDelta": 2
      },
      {
        "stage": "hint-3",
        "scoreDelta": 1
      }
    ]
  },
  "AC-08-T01": {
    "playerResult": {
      "scoreDelta": 0,
      "solved": false
    },
    "projectionAfterHint3": {
      "revealedTarget": "cat"
    }
  },
  "AC-09-T01": {
    "transitions": [
      {
        "submitted": [
          "p1"
        ],
        "stage": "hint-1",
        "hintRecipients": []
      },
      {
        "submitted": [
          "p1",
          "p2"
        ],
        "stage": "hint-2",
        "hintRecipients": [
          "p1",
          "p2"
        ]
      }
    ]
  },
  "AC-10-T01": {
    "acceptedSubmission": {
      "playerId": "p1",
      "acceptedAtMs": 13000,
      "elapsedMs": 12000,
      "scoreDelta": 3
    },
    "scorecard": [
      {
        "playerId": "p1",
        "icon": "owl",
        "points": 7,
        "elapsedMs": 12000
      }
    ]
  },
  "AC-11-T01": {
    "chooserId": "p1",
    "orderedCandidates": [
      "p1",
      "p3",
      "p2"
    ]
  },
  "AC-12-T01": {
    "rows": [
      {
        "playerId": "p2",
        "cumulativeScore": 6,
        "roundPoints": 3,
        "elapsedMs": 12000
      },
      {
        "playerId": "p1",
        "cumulativeScore": 5,
        "roundPoints": 0,
        "elapsedMs": null
      }
    ]
  },
  "AC-13-T01": {
    "status": "final",
    "rows": [
      {
        "rank": 1,
        "playerId": "p2",
        "totalScore": 12
      },
      {
        "rank": 2,
        "playerId": "p1",
        "totalScore": 10
      }
    ]
  },
  "AC-14-T01": {
    "standings": [
      {
        "rank": 1,
        "playerId": "fast",
        "score": 10,
        "tieSeconds": 30
      },
      {
        "rank": 2,
        "playerId": "slow",
        "score": 10,
        "tieSeconds": 50
      },
      {
        "rank": 3,
        "playerId": "penalty-a",
        "score": 8,
        "tieSeconds": 85
      },
      {
        "rank": 3,
        "playerId": "penalty-b",
        "score": 8,
        "tieSeconds": 85
      }
    ]
  },
  "AC-15-T01": {
    "renders": [
      {
        "orientation": "portrait",
        "scrollWidth": 390,
        "clientWidth": 390,
        "visible": [
          "answer",
          "hints",
          "scorecard"
        ],
        "interactions": [
          "touch",
          "keyboard"
        ]
      },
      {
        "orientation": "landscape",
        "scrollWidth": 844,
        "clientWidth": 844,
        "visible": [
          "answer",
          "hints",
          "scorecard"
        ],
        "interactions": [
          "touch",
          "keyboard"
        ]
      }
    ]
  },
  "AC-16-T01": {
    "playableIds": [
      "complete-approved"
    ],
    "excludedIds": [
      "missing-background",
      "disabled",
      "unapproved"
    ]
  },
  "AC-17-T01": {
    "results": [
      {
        "playerId": "p1",
        "result": "created"
      },
      {
        "playerId": "p2",
        "result": "ineligible"
      }
    ]
  },
  "AC-18-T01": {
    "results": [
      {
        "id": "n1",
        "eligibleForCuration": false,
        "playable": false
      },
      {
        "id": "n2",
        "eligibleForCuration": false,
        "playable": false
      },
      {
        "id": "n3",
        "eligibleForCuration": true,
        "playable": false
      }
    ]
  },
  "AC-18-T02": {
    "commandResults": [
      {
        "commandId": "appeal-1",
        "result": "appealed",
        "version": 5
      },
      {
        "commandId": "appeal-1",
        "result": "appealed",
        "version": 5
      },
      {
        "commandId": "resolve-1",
        "result": "approved-for-curation",
        "version": 6
      }
    ],
    "audit": [
      {
        "actorId": "p1",
        "action": "appealed",
        "reason": "Context supplied"
      },
      {
        "actorId": "m2",
        "action": "overturned",
        "reason": "Evidence verified"
      }
    ],
    "directPublications": 0,
    "originalReviewerResolution": "forbidden",
    "secondAppeal": "already-appealed",
    "staleVersionResult": "version-conflict"
  },
  "AC-19-T01": {
    "results": [
      "locked",
      "created",
      "invalid-pair-count"
    ],
    "openSuggestions": 1
  },
  "AC-20-T01": {
    "results": [
      {
        "token": "verified",
        "profileId": "p1",
        "associationsCreated": 1
      },
      {
        "token": "bad-signature",
        "error": "invalid-token",
        "associationsCreated": 0
      }
    ]
  },
  "AC-21-T01": {
    "identity": {
      "kind": "guest",
      "id": "guest-1",
      "icon": "owl"
    },
    "allowedActions": [
      "create-room",
      "join-by-code"
    ]
  },
  "AC-22-T01": {
    "joinableRoomIds": [
      "open"
    ]
  },
  "AC-23-T01": {
    "selectedRoomId": "room-a",
    "joinCommand": {
      "authority": "capacity-checked-assignment"
    },
    "emptyFallback": [
      "browse",
      "create"
    ]
  },
  "AC-23-T02": {
    "results": [
      "joined",
      "no-slot"
    ],
    "playersAfter": [
      "p1",
      "p2"
    ],
    "duplicateMemberships": []
  },
  "AC-24-T01": {
    "decisions": [
      {
        "value": 1,
        "accepted": false
      },
      {
        "value": 2,
        "accepted": true
      },
      {
        "value": 25,
        "accepted": true
      },
      {
        "value": 26,
        "accepted": false
      }
    ]
  },
  "AC-25-T01": {
    "results": [
      {
        "code": "ABCD",
        "resolvedRoomId": "active-open",
        "membership": "player"
      },
      {
        "code": "EFGH",
        "resolvedRoomId": "active-full",
        "membership": null
      }
    ]
  },
  "AC-26-T01": {
    "browseShown": false,
    "results": [
      {
        "roomId": "open",
        "offer": "join-player"
      },
      {
        "roomId": "full",
        "offer": "join-observer"
      }
    ]
  },
  "AC-27-T01": {
    "playerCount": 2,
    "observers": [
      {
        "id": "o1",
        "follows": "p2"
      }
    ]
  },
  "AC-28-T01": {
    "projectedPlayerId": "p2",
    "commandResults": [
      "forbidden",
      "forbidden",
      "forbidden"
    ],
    "scoreRows": []
  },
  "AC-29-T01": {
    "event": {
      "type": "reaction",
      "emoji": "👍",
      "recipients": [
        "p1",
        "p2",
        "o1"
      ]
    },
    "after": {
      "score": 5,
      "answer": null,
      "roundVersion": 3
    }
  },
  "AC-30-T01": {
    "players": [
      "p1",
      "p3",
      "p4",
      "o1"
    ],
    "observers": [
      "o2"
    ],
    "promoted": {
      "observerId": "o1",
      "position": 4
    }
  },
  "AC-30-T02": {
    "players": [
      "p1",
      "p3"
    ],
    "observers": [],
    "openSeats": 1
  },
  "AC-30-T03": {
    "firstAttempt": "version-conflict",
    "retriedVersion": 8,
    "promotedObserver": "o2",
    "players": [
      "p1",
      "p3",
      "o2"
    ]
  },
  "AC-30-T04": {
    "promotedObserver": "o2",
    "remainingObservers": [
      "o9"
    ]
  },
  "AC-31-T01": {
    "roomVersion": 5,
    "players": [
      {
        "id": "p1",
        "ready": true
      },
      {
        "id": "p2",
        "ready": true
      }
    ],
    "countdown": {
      "seconds": 10,
      "roster": [
        "p1",
        "p2"
      ],
      "locked": true
    },
    "emittedEvents": [
      "countdown-started"
    ]
  },
  "AC-31-T02": {
    "players": [
      "p1",
      "p3"
    ],
    "observers": [
      "o1"
    ],
    "vacancy": true,
    "promoted": null
  },
  "AC-31-T03": {
    "leaveResult": "left",
    "promotionResult": "roster-locked",
    "players": [
      "p1"
    ],
    "observers": [
      "o1"
    ]
  },
  "AC-31-T04": {
    "gameStarted": false,
    "roomState": "closed",
    "players": [
      "p1"
    ],
    "observers": [
      "o1"
    ]
  },
  "AC-32-T01": {
    "warningShownForMs": 5000,
    "deadlineResult": "stale",
    "countdown": {
      "started": true,
      "seconds": 10
    }
  },
  "AC-32-T02": {
    "players": [
      "p1",
      "p2"
    ],
    "removed": "p3",
    "countdown": {
      "started": true,
      "lockedRoster": [
        "p1",
        "p2"
      ]
    }
  },
  "AC-32-T03": {
    "applied": [
      "ready-p3"
    ],
    "stale": [
      "expire-p3"
    ],
    "roomVersion": 10,
    "countdownStarts": 1
  },
  "AC-32-T04": {
    "players": [
      "p1",
      "p2"
    ],
    "removed": null,
    "countdown": null,
    "roomState": "waiting"
  },
  "AC-33-T01": {
    "prompts": [
      {
        "roomVersion": 3,
        "recipients": [
          "p1",
          "p2"
        ]
      }
    ],
    "repeatedCallbackPrompts": 0,
    "changedVersionCallbackPrompts": 0,
    "resetDelayMs": 30000
  },
  "AC-37-T01": {
    "result": {
      "code": "SERVICE_LIMIT",
      "retryableWithCommandId": "cmd-1"
    },
    "stateAfter": {
      "version": 4
    },
    "providerCalls": [
      "free-tier"
    ],
    "paidFallbackCalls": 0
  },
  "AC-38-T01": {
    "missingAcIds": [],
    "missingTestIds": [],
    "incompleteMockRecords": [],
    "deploymentEvidenceRequired": false
  },
  "AC-39-T01": {
    "directNames": [
      "vitest"
    ],
    "attributedNames": [
      "vitest"
    ],
    "records": [
      {
        "name": "vitest",
        "purpose": "test runner",
        "license": "MIT",
        "upstream": "https://github.com/vitest-dev/vitest",
        "declaredVersion": "5.0.5",
        "lockedVersion": "5.0.5"
      }
    ]
  },
  "AC-41-T01": {
    "requiredCommit": "abc123",
    "archives": [
      {
        "name": "valid.tar",
        "entries": [
          {
            "path": "src/index.ts",
            "content": "source"
          },
          {
            "path": "swbom/abc123.cdx.json",
            "content": "{\"bomFormat\":\"CycloneDX\",\"commit\":\"abc123\"}"
          }
        ],
        "decision": "accepted"
      },
      {
        "name": "missing.tar",
        "entries": [
          {
            "path": "src/index.ts",
            "content": "source"
          }
        ],
        "decision": "missing-swbom"
      },
      {
        "name": "wrong.tar",
        "entries": [
          {
            "path": "swbom/abc123.cdx.json",
            "content": "{\"bomFormat\":\"CycloneDX\",\"commit\":\"def456\"}"
          }
        ],
        "decision": "commit-mismatch"
      },
      {
        "name": "invalid.tar",
        "entries": [
          {
            "path": "swbom/abc123.cdx.json",
            "content": "not-json"
          }
        ],
        "decision": "invalid-swbom"
      }
    ]
  },
  "AC-42-T01": {
    "entries": [
      {
        "path": "LICENSE",
        "content": "GNU GENERAL PUBLIC LICENSE\nVersion 2, June 1991\nEND OF TERMS AND CONDITIONS"
      },
      {
        "path": "docs/ATTRIBUTIONS.md",
        "content": "Recursive font | SIL Open Font License 1.1"
      }
    ],
    "spdx": "GPL-2.0-only"
  },
  "AC-43-T01": {
    "sections": [
      "leaderboard",
      "joinable-lobbies",
      "rules"
    ],
    "rules": {
      "version": "2.6",
      "updated": "2026-10-26"
    },
    "emptyState": "No games yet",
    "unavailableState": "Try again later",
    "signInRequired": false
  },
  "AC-43-T02": {
    "rows": [
      {
        "alias": "Guest Cedar",
        "profileId": "g1"
      },
      {
        "alias": "Player p1",
        "profileId": "p1"
      },
      {
        "alias": "Player p2",
        "profileId": "p2"
      }
    ],
    "excludedProfileIds": [
      "g2"
    ],
    "refreshAtMs": 300000
  },
  "AC-43-T03": {
    "cards": [
      {
        "roomId": "r1",
        "playerCount": 2,
        "capacity": 4,
        "state": "waiting",
        "ageSeconds": 60
      }
    ],
    "refreshAtMs": 75000
  },
  "AC-44-T01": {
    "results": [
      {
        "viewport": "portrait",
        "inputs": [
          "touch",
          "keyboard"
        ],
        "visibleFocus": true,
        "contrastRatio": 4.5,
        "statusText": "Ready"
      },
      {
        "viewport": "landscape",
        "inputs": [
          "touch",
          "keyboard"
        ],
        "visibleFocus": true,
        "contrastRatio": 4.5,
        "statusText": "Ready"
      }
    ]
  },
  "AC-45-T01": {
    "acceptances": [
      {
        "commandId": "cmd-1",
        "scoreDelta": 5
      }
    ],
    "scoreAfter": 5
  },
  "AC-45-T02": {
    "result": "incorrect",
    "scoreAfter": 5,
    "emittedEvents": []
  },
  "AC-45-T03": {
    "beforeReveal": {
      "player": {},
      "observer": {}
    },
    "afterReveal": {
      "player": {
        "target": "cat"
      },
      "observer": {
        "target": "cat"
      }
    }
  },
  "AC-46-T01": {
    "results": [
      {
        "claim": "signature",
        "result": "rejected"
      },
      {
        "claim": "issuer",
        "result": "rejected"
      },
      {
        "claim": "audience",
        "result": "rejected"
      },
      {
        "claim": "state",
        "result": "rejected"
      },
      {
        "claim": "nonce",
        "result": "rejected"
      },
      {
        "claim": "expiry",
        "result": "rejected"
      }
    ],
    "profileAssociationsCreated": 0
  },
  "AC-47-T01": {
    "result": "forbidden",
    "moderationVersionBefore": 3,
    "moderationVersionAfter": 3,
    "catalogEntriesCreated": 0
  },
  "AC-47-T02": {
    "auditRecords": [
      {
        "candidateId": "complete-approved",
        "action": "approved",
        "actorRole": "moderator"
      }
    ],
    "playableIds": [
      "complete-approved"
    ]
  },
  "AC-47-T03": {
    "appealAudit": {
      "actor": "p1",
      "action": "appealed"
    },
    "resolutionAudit": {
      "actor": "m2",
      "reason": "Evidence verified",
      "outcome": "overturned"
    },
    "originalReviewerAttempt": "forbidden",
    "secondAppealAttempt": "already-appealed",
    "catalogPublications": 0
  },
  "AC-50-T01": {
    "leaderboard": [
      {
        "alias": "Player Oak",
        "wins": 2,
        "points": 17
      }
    ],
    "lobbies": [
      {
        "roomId": "room-public-1",
        "playerCount": 2,
        "capacity": 4,
        "state": "waiting",
        "ageSeconds": 60
      }
    ],
    "rules": {
      "version": "2.6",
      "updated": "2026-10-26"
    }
  },
  "AC-51-T01": {
    "forbiddenImports": [],
    "checkedSpecifiers": [
      "next",
      "@supabase/supabase-js"
    ]
  },
  "AC-51-T02": {
    "issuedCommands": [
      {
        "type": "assign-if-capacity",
        "capacity": 2
      }
    ],
    "results": [
      "joined",
      "no-slot"
    ],
    "playersExposed": 2,
    "databaseSerializationClaimed": false
  },
  "AC-51-T03": {
    "results": [
      {
        "status": "joined",
        "roomId": "r1"
      },
      {
        "status": "joined",
        "roomId": "r1"
      }
    ],
    "domainSideEffectCalls": 1,
    "databaseUniquenessClaimed": false
  },
  "AC-51-T04": {
    "committed": {
      "domainMutations": 1,
      "outboxIntents": 1
    },
    "rolledBack": {
      "domainMutations": 0,
      "outboxIntents": 0
    },
    "databaseAtomicityClaimed": false
  }
} as const;
