export type MangoExamples = {
  "version": "0.1.0",
  "name": "mango_examples",
  "instructions": [
    {
      "name": "initializeAccount",
      "accounts": [
        {
          "name": "mangoProgramAi",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mangoGroup",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mangoAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "deposit",
      "accounts": [
        {
          "name": "mangoProgramAi",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mangoGroup",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mangoAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "mangoCacheAi",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rootBankAi",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "nodeBankAi",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "clientTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "client",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "clientAccountInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "accBump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "withdraw",
      "accounts": [
        {
          "name": "mangoProgramAi",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mangoGroup",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mangoAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "mangoCacheAi",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rootBankAi",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "nodeBankAi",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "clientTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "client",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clientAccountInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "clientAccountInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "clientKey",
            "type": "publicKey"
          },
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    }
  ]
};

export const IDL: MangoExamples = {
  "version": "0.1.0",
  "name": "mango_examples",
  "instructions": [
    {
      "name": "initializeAccount",
      "accounts": [
        {
          "name": "mangoProgramAi",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mangoGroup",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mangoAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "deposit",
      "accounts": [
        {
          "name": "mangoProgramAi",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mangoGroup",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mangoAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "mangoCacheAi",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rootBankAi",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "nodeBankAi",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "clientTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "client",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "clientAccountInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "accBump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "withdraw",
      "accounts": [
        {
          "name": "mangoProgramAi",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mangoGroup",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mangoAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "mangoCacheAi",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rootBankAi",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "nodeBankAi",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "clientTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "client",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "clientAccountInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "clientAccountInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "clientKey",
            "type": "publicKey"
          },
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
